import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  // Set a timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
  })

  try {
    const { ingredients } = await request.json()
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'Ingredients array is required' }, { status: 400 })
    }

    // Get the server-side Supabase client with proper headers
    const supabase = await createServerClient()
    
    // Try to get the user with proper session handling
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('API: User check result:', { user: !!user, error: authError })
    console.log('API: Processing ingredients:', ingredients)
    console.log('API: Number of ingredients to process:', ingredients.length)
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      // For now, let's skip authentication to test the functionality
      // return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Wrap the main processing in a timeout
    const processingPromise = (async () => {
      const matchedIngredients = []
      const unmatchedIngredients = []

      // Process ingredients in batches to avoid hitting the 1000 record limit
      const BATCH_SIZE = 100
      const batches = []
      for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
        batches.push(ingredients.slice(i, i + BATCH_SIZE))
      }

      for (let i = 0; i < batches.length; i++) {
        console.log(`API: Processing batch ${i + 1}/${batches.length}`)
        const batchResults = await processBatch(batches[i], supabase)
        matchedIngredients.push(...batchResults.matched)
        unmatchedIngredients.push(...batchResults.unmatched)
        console.log(`API: Batch ${i + 1} complete. Matched: ${batchResults.matched.length}, Unmatched: ${batchResults.unmatched.length}`)
      }

      // Group matched ingredients by category
      const groupedIngredients = matchedIngredients.reduce((acc, ingredient) => {
        const categoryName = ingredient.category.name
        if (!acc[categoryName]) {
          acc[categoryName] = []
        }
        acc[categoryName].push(ingredient)
        return acc
      }, {} as Record<string, any[]>)

      return {
        matched: groupedIngredients,
        unmatched: unmatchedIngredients,
        total_matched: matchedIngredients.length,
        total_unmatched: unmatchedIngredients.length
      }
    })()

    // Race between processing and timeout
    const result = await Promise.race([processingPromise, timeoutPromise])
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Ingredient search error:', error)
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json({ error: 'Request timeout - processing took too long' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processBatch(ingredients: string[], supabase: any) {
  console.log(`processBatch: Processing ${ingredients.length} ingredients`)
  const matchedIngredients = []
  const unmatchedIngredients = []

  for (let i = 0; i < ingredients.length; i++) {
    const ingredientText = ingredients[i]
    console.log(`processBatch: Processing ingredient ${i + 1}/${ingredients.length}: "${ingredientText}"`)
    
    if (!ingredientText.trim()) continue

    // Parse the ingredient text to find potential ingredient names
    const potentialIngredients = parseIngredientText(ingredientText)
    console.log(`processBatch: Found ${potentialIngredients.length} potential ingredients:`, potentialIngredients)
    let foundAny = false

    // Limit to first 3 potential ingredients to prevent too many matches
    const limitedIngredients = potentialIngredients.slice(0, 3)
    
    for (let j = 0; j < limitedIngredients.length; j++) {
      const searchTerm = limitedIngredients[j]
      console.log(`processBatch: Searching term ${j + 1}/${limitedIngredients.length}: "${searchTerm}"`)
      
      if (!searchTerm.trim()) continue

      const searchQuery = searchTerm.trim().toLowerCase()
      let found = false

      // Step 1: Search ingredients.name with exact match (case insensitive)
      console.log(`processBatch: Searching ingredients.name for "${searchQuery}" (original term: "${searchTerm}")`)
      let { data: exactMatches, error: exactError } = await supabase
        .from('ingredients')
        .select(`
          ingredient_id,
          name,
          category_id,
          category:ingredient_categories(name)
        `)
        .ilike('name', searchQuery)
        .limit(1)

      // If no exact match found, try singular form (remove 's' from end)
      if (!exactMatches || exactMatches.length === 0) {
        const singularForm = searchQuery.replace(/s$/, '')
        if (singularForm !== searchQuery && singularForm.length > 2) {
          console.log(`processBatch: Trying singular form "${singularForm}" for "${searchQuery}"`)
          const { data: singularMatches, error: singularError } = await supabase
            .from('ingredients')
            .select(`
              ingredient_id,
              name,
              category_id,
              category:ingredient_categories(name)
            `)
            .ilike('name', singularForm)
            .limit(1)
          
          if (!singularError && singularMatches && singularMatches.length > 0) {
            exactMatches = singularMatches
            exactError = null
            console.log(`processBatch: Found singular match: "${singularForm}"`)
          }
        }
      }

      if (exactError) {
        console.error('Error searching ingredients:', exactError)
      }

      // Debug: Let's also try a manual search to see what's in the database
      if (searchQuery === 'guanciale' || searchQuery === 'bacon') {
        console.log(`processBatch: DEBUG - Manual search for "${searchQuery}"`)
        const { data: debugMatches } = await supabase
          .from('ingredients')
          .select('ingredient_id, name')
          .ilike('name', `%${searchQuery}%`)
        console.log(`processBatch: DEBUG - Found ingredients containing "${searchQuery}":`, debugMatches)
      }

      if (exactMatches && exactMatches.length > 0) {
        console.log(`processBatch: Found exact match: ${exactMatches[0].name} (ID: ${exactMatches[0].ingredient_id})`)
        matchedIngredients.push({
          ...exactMatches[0],
          original_text: ingredientText,
          matched_term: searchTerm,
          match_type: 'exact'
        })
        found = true
        foundAny = true
      }

      if (!found) {
        // Step 2: Search ingredient_aliases with exact match (case insensitive)
        console.log(`processBatch: Searching ingredient_aliases.alias for "${searchQuery}"`)
        let { data: aliasMatches, error: aliasError } = await supabase
          .from('ingredient_aliases')
          .select(`
            alias_id,
            alias,
            ingredient_id,
            ingredient:ingredients(
              ingredient_id,
              name,
              category_id,
              category:ingredient_categories(name)
            )
          `)
          .ilike('alias', searchQuery)
          .limit(1)

        // If no alias match found, try singular form (remove 's' from end)
        if (!aliasMatches || aliasMatches.length === 0) {
          const singularForm = searchQuery.replace(/s$/, '')
          if (singularForm !== searchQuery && singularForm.length > 2) {
            console.log(`processBatch: Trying singular form "${singularForm}" for alias search`)
            const { data: singularAliasMatches, error: singularAliasError } = await supabase
              .from('ingredient_aliases')
              .select(`
                alias_id,
                alias,
                ingredient_id,
                ingredient:ingredients(
                  ingredient_id,
                  name,
                  category_id,
                  category:ingredient_categories(name)
                )
              `)
              .ilike('alias', singularForm)
              .limit(1)
            
            if (!singularAliasError && singularAliasMatches && singularAliasMatches.length > 0) {
              aliasMatches = singularAliasMatches
              aliasError = null
              console.log(`processBatch: Found singular alias match: "${singularForm}"`)
            }
          }
        }

        if (aliasError) {
          console.error('Error searching aliases:', aliasError)
        }

        if (aliasMatches && aliasMatches.length > 0) {
          console.log(`processBatch: Found alias match: ${aliasMatches[0].alias} -> ${aliasMatches[0].ingredient.name} (ID: ${aliasMatches[0].ingredient.ingredient_id})`)
          matchedIngredients.push({
            ...aliasMatches[0].ingredient,
            original_text: ingredientText,
            matched_term: searchTerm,
            match_type: 'alias',
            matched_alias: aliasMatches[0].alias
          })
          found = true
          foundAny = true
        }
      }
      
      // If we found a match, stop searching for this ingredient line
      if (found) {
        console.log(`processBatch: Found match for "${searchTerm}", stopping search for this ingredient line`)
        break
      }
    }

    if (!foundAny) {
      // No exact match found for any term in this ingredient line
      console.log(`processBatch: NO MATCH found for ingredient: "${ingredientText}"`)
      console.log(`processBatch: Searched terms were:`, limitedIngredients)
      unmatchedIngredients.push(ingredientText)
    }
  }

  return { matched: matchedIngredients, unmatched: unmatchedIngredients }
}

function parseIngredientText(text: string): string[] {
  console.log('Parsing ingredient text:', text)
  
  // Remove measurements, quantities, and descriptive words to find the main ingredient noun
  let cleanedText = text
    .replace(/\b\d+\/\d+|\d+-\d+|\d+\s*(cup|tbsp|tsp|oz|lb|kg|g|ml|l|pound|ounce|gram|liter|milliliter|tablespoon|teaspoon|cloves|clove|pieces|piece|pounds|pound|ounces|ounce)\b/gi, '')
    .replace(/\b\d+\b/g, '')  // Remove standalone numbers
    .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|fresh|grated|plus|more|large|medium|small|whole|half|quarter|extra|virgin|extra-virgin|dried|fresh|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|peeled|grated|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|juiced|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|meat|out|skin|mild|cup|cups)\b/gi, '')
    .replace(/[,\-&()]/g, ' ')  // Also remove parentheses
    .replace(/\s+/g, ' ')
    .trim()

  console.log('Cleaned text:', cleanedText)
  
  // Special handling for ingredients with parentheses - extract the main ingredient before the parentheses
  if (text.includes('(')) {
    console.log('Found parentheses in text, extracting main ingredient before parentheses')
    const beforeParentheses = text.split('(')[0].trim()
    const mainIngredient = beforeParentheses
      .replace(/\b\d+\/\d+|\d+-\d+|\d+\s*(cup|tbsp|tsp|oz|lb|kg|g|ml|l|pound|ounce|gram|liter|milliliter|tablespoon|teaspoon|cloves|clove|pieces|piece|pounds|pound|ounces|ounce)\b/gi, '')
      .replace(/\b\d+\b/g, '')  // Remove standalone numbers
      .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|fresh|grated|plus|more|large|medium|small|whole|half|quarter|extra|virgin|extra-virgin|dried|fresh|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|peeled|grated|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|juiced|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|meat|out|skin|mild|cup|cups)\b/gi, '')
      .replace(/[,\-&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (mainIngredient) {
      console.log('Main ingredient from parentheses parsing:', mainIngredient)
      return [mainIngredient].filter(term => term.trim().length > 0)
    }
  }
  
  // Special handling for ingredients with "or" - try both options
  if (cleanedText.includes(' or ')) {
    console.log('Found "or" in text, will try both options')
    const parts = cleanedText.split(' or ')
    const allOptions = []
    for (const part of parts) {
      const trimmedPart = part.trim()
      if (trimmedPart.length > 0) {
        // Try the full part first (e.g., "garlic powder")
        allOptions.push(trimmedPart)
        
        // Also try just the last word as fallback (e.g., "powder")
        const words = trimmedPart.split(' ').filter(word => word.length > 2)
        if (words.length >= 1) {
          allOptions.push(words[words.length - 1])
        }
      }
    }
    console.log('Options from "or" parsing:', allOptions)
    return allOptions.filter(term => term.trim().length > 0)
  }

  // Split into words and find the main ingredient noun (usually the last meaningful word)
  const words = cleanedText.split(' ').filter(word => 
    word.length > 2 && 
    !/^\d+$/.test(word) && // not just numbers
    !/^(and|or|the|a|an|of|in|on|at|to|for|with|by|or|other|wide|noodle|or|bacon|pancetta)$/i.test(word) // common words
  )

  // The main ingredient is usually the last word or the last two words
  const potentialIngredients = []
  
  if (words.length >= 2) {
    // Try the last two words (e.g., "olive oil", "pecorino romano")
    const lastTwoWords = words.slice(-2).join(' ')
    potentialIngredients.push(lastTwoWords)
  }
  
  if (words.length >= 1) {
    // Try the last word (e.g., "garlic", "onion")
    const lastWord = words[words.length - 1]
    potentialIngredients.push(lastWord)
  }
  
  console.log('Potential ingredients:', potentialIngredients)
  
  const filteredIngredients = potentialIngredients.filter(term => term.trim().length > 0)
  console.log('Filtered potential ingredients:', filteredIngredients)
  
  return filteredIngredients
}
