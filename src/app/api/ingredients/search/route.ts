import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  // Set a timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 60000) // 60 second timeout
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

      // Process ingredients in smaller batches to avoid timeout
      const BATCH_SIZE = 10
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
    const potentialIngredients = await parseIngredientText(ingredientText, supabase)
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

      // Strict matching: Only exact matches (case insensitive + singular/plural)
      console.log(`processBatch: Searching for "${searchQuery}" (original term: "${searchTerm}")`)
      
      // Try exact match first (case insensitive)
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

      // If no exact match, try singular/plural variations
      if (!exactMatches || exactMatches.length === 0) {
        const pluralForm = searchQuery + 's'
        const singularForm = searchQuery.replace(/s$/, '')
        
        console.log(`processBatch: Trying singular/plural variations: exact="${searchQuery}", plural="${pluralForm}", singular="${singularForm}"`)
        
        // Try all variations: exact, plural, singular, and also try matching against both forms
        const searchTerms = [searchQuery, pluralForm, singularForm]
        
        // Also try the reverse - if we have "red onions", try "red onion" in database
        if (searchQuery.includes(' ')) {
          const words = searchQuery.split(' ')
          const lastWord = words[words.length - 1]
          if (lastWord.endsWith('s')) {
            const singularLastWord = lastWord.replace(/s$/, '')
            const singularPhrase = words.slice(0, -1).join(' ') + ' ' + singularLastWord
            searchTerms.push(singularPhrase)
            console.log(`processBatch: Also trying singular phrase: "${singularPhrase}"`)
          }
        }
        
        const { data: variationMatches, error: variationError } = await supabase
          .from('ingredients')
          .select(`
            ingredient_id,
            name,
            category_id,
            category:ingredient_categories(name)
          `)
          .or(searchTerms.map(term => `name.ilike.${term}`).join(','))
          .limit(1)
        
        if (!variationError && variationMatches && variationMatches.length > 0) {
          exactMatches = variationMatches
          exactError = null
          console.log(`processBatch: Found singular/plural match: "${variationMatches[0].name}"`)
        }
      }

      if (exactError) {
        console.error('Error searching ingredients:', exactError)
      }

      // Debug: Let's also try a manual search to see what's in the database
      if (searchQuery === 'coriander powder' || searchQuery === 'cardamom powder' || searchQuery === 'green chilies') {
        console.log(`processBatch: DEBUG - Manual search for "${searchQuery}"`)
        const { data: debugMatches } = await supabase
          .from('ingredients')
          .select('ingredient_id, name')
          .ilike('name', `%${searchQuery}%`)
        console.log(`processBatch: DEBUG - Found ingredients containing "${searchQuery}":`, debugMatches)
        
        // Also try exact match
        const { data: exactDebugMatches } = await supabase
          .from('ingredients')
          .select('ingredient_id, name')
          .ilike('name', searchQuery)
        console.log(`processBatch: DEBUG - Found exact match for "${searchQuery}":`, exactDebugMatches)
        
        // Check what exactMatches contains
        console.log(`processBatch: DEBUG - exactMatches for "${searchQuery}":`, exactMatches)
        console.log(`processBatch: DEBUG - exactError for "${searchQuery}":`, exactError)
      }

      if (exactMatches && exactMatches.length > 0) {
        const matchedIngredient = exactMatches[0]
        const isExactMatch = matchedIngredient.name.toLowerCase() === searchQuery.toLowerCase()
        const matchType = isExactMatch ? 'exact' : 'partial'
        
        console.log(`processBatch: Found ${matchType} match: ${matchedIngredient.name} (ID: ${matchedIngredient.ingredient_id})`)
        matchedIngredients.push({
          ...matchedIngredient,
          original_text: ingredientText,
          matched_term: searchTerm,
          match_type: matchType
        })
        found = true
        foundAny = true
      }

      if (!found) {
        // Check two_word_ingredients table if not found in main ingredients table
        console.log(`processBatch: Searching two_word_ingredients for "${searchQuery}"`)
        let { data: twoWordMatches, error: twoWordError } = await supabase
          .from('two_word_ingredients')
          .select('ingredient_name')
          .ilike('ingredient_name', searchQuery)
          .limit(1)

        if (!twoWordError && twoWordMatches && twoWordMatches.length > 0) {
          // Found in two_word_ingredients, now find the corresponding ingredient
          const twoWordName = twoWordMatches[0].ingredient_name
          console.log(`processBatch: Found in two_word_ingredients: "${twoWordName}"`)
          
          // Try to find the ingredient by name (case insensitive)
          const { data: ingredientMatches, error: ingredientError } = await supabase
            .from('ingredients')
            .select(`
              ingredient_id,
              name,
              category_id,
              category:ingredient_categories(name)
            `)
            .ilike('name', twoWordName)
            .limit(1)
          
          if (!ingredientError && ingredientMatches && ingredientMatches.length > 0) {
            const matchedIngredient = ingredientMatches[0]
            console.log(`processBatch: Found corresponding ingredient: ${matchedIngredient.name} (ID: ${matchedIngredient.ingredient_id})`)
            matchedIngredients.push({
              ...matchedIngredient,
              original_text: ingredientText,
              matched_term: searchTerm,
              match_type: 'exact'
            })
            found = true
            foundAny = true
          } else {
            console.log(`processBatch: Two-word ingredient "${twoWordName}" not found in ingredients table`)
          }
        }
      }

      if (!found) {
        // Strict alias matching: Only exact matches (case insensitive + singular/plural)
        console.log(`processBatch: Searching ingredient_aliases for "${searchQuery}"`)
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

        // If no exact alias match, try singular/plural variations
        if (!aliasMatches || aliasMatches.length === 0) {
          const pluralForm = searchQuery + 's'
          const singularForm = searchQuery.replace(/s$/, '')
          
          console.log(`processBatch: Trying alias singular/plural variations: exact="${searchQuery}", plural="${pluralForm}", singular="${singularForm}"`)
          
          // Try all variations: exact, plural, singular, and also try matching against both forms
          const aliasSearchTerms = [searchQuery, pluralForm, singularForm]
          
          // Also try the reverse - if we have "red onions", try "red onion" in database
          if (searchQuery.includes(' ')) {
            const words = searchQuery.split(' ')
            const lastWord = words[words.length - 1]
            if (lastWord.endsWith('s')) {
              const singularLastWord = lastWord.replace(/s$/, '')
              const singularPhrase = words.slice(0, -1).join(' ') + ' ' + singularLastWord
              aliasSearchTerms.push(singularPhrase)
              console.log(`processBatch: Also trying alias singular phrase: "${singularPhrase}"`)
            }
          }
          
          const { data: aliasVariationMatches, error: aliasVariationError } = await supabase
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
            .or(aliasSearchTerms.map(term => `alias.ilike.${term}`).join(','))
            .limit(1)
          
          if (!aliasVariationError && aliasVariationMatches && aliasVariationMatches.length > 0) {
            aliasMatches = aliasVariationMatches
            aliasError = null
            console.log(`processBatch: Found alias singular/plural match: "${aliasVariationMatches[0].alias}"`)
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

async function parseIngredientText(text: string, supabase: any): Promise<string[]> {
  console.log('Parsing ingredient text:', text)
  
  const potentialIngredients: string[] = []
  
  // STEP 1: Two-word lookup FIRST (before aggressive cleaning)
  // Light cleaning for two-word lookup - preserve descriptive words
  let lightCleaned = text.toLowerCase()
    .replace(/\d+\/\d+/g, '') // Remove fractions
    .replace(/\d+/g, '') // Remove numbers  
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\b(lbs?|pounds?|cups?|tablespoons?|tsp|tbsp|oz|ounces?|grams?|g|ml|liters?)\b/g, '') // Remove units
    .replace(/\s+/g, ' ')
    .trim()
  
  console.log('Light cleaned text for two-word lookup:', lightCleaned)
  
  const lightWords = lightCleaned.split(' ')
  
  // Check for two-word combinations in lightly cleaned text
  for (let i = 0; i < lightWords.length - 1; i++) {
    const twoWord = `${lightWords[i]} ${lightWords[i + 1]}`
    
    const { data: twoWordMatches } = await supabase
      .from('two_word_ingredients')
      .select('ingredient_name')
      .ilike('ingredient_name', twoWord)
    
    if (twoWordMatches && twoWordMatches.length > 0) {
      potentialIngredients.push(twoWord)
      console.log('Found two-word ingredient from light cleaning:', twoWord)
      return potentialIngredients // Return early if found
    }
  }
  
  // STEP 2: Enhanced cleaning for single words and fallbacks
  // Enhanced cleaning - remove measurements, quantities, and descriptive words
  let cleanedText = text
    .replace(/\b\d+\.?\d*\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')
    .replace(/\b\d+\.?\d*\s*-\s*\d+\.?\d*\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')
    .replace(/\bounce\b/gi, '')  // Remove standalone "ounce" that might be left over
    .replace(/\b\d+\.?\d*\b/g, '')  // Remove standalone numbers (including decimals)
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')  // Remove Unicode fractions with units
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, '')  // Remove standalone Unicode fractions
    .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|grated|plus|more|large|medium|small|whole|half|quarter|extra|virgin|extra-virgin|dried|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|peeled|diced|minced|chopped|sliced|grated|crushed|whole|large|medium|small|dried|frozen|canned|raw|cooked|roasted|grilled|fried|boiled|steamed|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|juiced|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|meat|out|skin|mild|cup|cups|such|as|at|room|temperature|rind)\b/gi, '')
    .replace(/[,\-&()]/g, ' ')  // Replace commas, dashes, ampersands, parentheses with spaces
    .replace(/\s+/g, ' ')
    .trim()

  console.log('Cleaned text:', cleanedText)
  
  // Special handling for ingredients with parentheses - extract the main ingredient before the parentheses
  if (text.includes('(')) {
    console.log('Found parentheses in text, extracting main ingredient before parentheses')
    const beforeParentheses = text.split('(')[0].trim()
    const afterParentheses = text.split(')')[1] ? text.split(')')[1].trim() : ''
    console.log('Before parentheses:', beforeParentheses)
    console.log('After parentheses:', afterParentheses)
    
    // Combine before and after parentheses to get the full ingredient
    const fullIngredient = (beforeParentheses + ' ' + afterParentheses).trim()
    console.log('Full ingredient (before + after):', fullIngredient)
    
    // Clean the full ingredient
    const cleanedFullIngredient = fullIngredient
      .replace(/\b\d+\.?\d*\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')
      .replace(/\b\d+\.?\d*\s*-\s*\d+\.?\d*\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')
      .replace(/\bounce\b/gi, '')  // Remove standalone "ounce" that might be left over
      .replace(/\b\d+\.?\d*\b/g, '')  // Remove standalone numbers (including decimals)
      .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|grated|plus|more|large|medium|small|whole|half|quarter|extra|virgin|extra-virgin|dried|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|peeled|diced|minced|chopped|sliced|grated|crushed|whole|large|medium|small|dried|frozen|canned|raw|cooked|roasted|grilled|fried|boiled|steamed|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|juiced|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|meat|out|skin|mild|cup|cups|such|as|at|room|temperature|rind)\b/gi, '')
      .replace(/[,\-&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log('Cleaned full ingredient:', cleanedFullIngredient)
    
    // If we still have measurements, try to extract just the ingredient part
    if (cleanedFullIngredient && cleanedFullIngredient.includes(' ')) {
      const cleanedWords = cleanedFullIngredient.split(' ').filter(word => 
        word.length > 2 && 
        !/^\d+$/.test(word) && // not just numbers
        !/^(and|or|the|a|an|of|in|on|at|to|for|with|by|other|wide|noodle|chicken|vegetable|broth|salt|pepper|black|white|red|green|yellow|blue|purple|orange|pink|brown|gray|grey|bottles|bottle|such|as|at|room|temperature|rind|teaspoon|tablespoon|cup|cups|tbsp|tsp|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)$/i.test(word) // common words, colors, and measurements
      )
      
      if (cleanedWords.length > 0) {
        // Try the last two words first (for "cumin seeds")
        if (cleanedWords.length >= 2) {
          const lastTwoWords = cleanedWords.slice(-2).join(' ')
          console.log('Extracted two-word ingredient from parentheses:', lastTwoWords)
          return [lastTwoWords].filter(term => term.trim().length > 0)
        }
        
        // Fall back to last word
        const lastWord = cleanedWords[cleanedWords.length - 1]
        console.log('Extracted single-word ingredient from parentheses:', lastWord)
        return [lastWord].filter(term => term.trim().length > 0)
      }
    }
    
    if (cleanedFullIngredient) {
      console.log('Main ingredient from parentheses parsing:', cleanedFullIngredient)
      
      // If the main ingredient contains "or", handle it specially
      if (cleanedFullIngredient.includes(' or ')) {
        console.log('Found "or" in parentheses-extracted ingredient, splitting options')
        const parts = cleanedFullIngredient.split(' or ')
        const allOptions = []
        for (const part of parts) {
          const trimmedPart = part.trim()
          if (trimmedPart.length > 0) {
            // For "Chicken or Vegetable Broth", we want:
            // - "Chicken Broth" (first part + last word of second part)
            // - "Vegetable Broth" (second part)
            
            if (parts.length === 2) {
              const firstPart = parts[0].trim()
              const secondPart = parts[1].trim()
              
              // If second part has multiple words, combine first part with last word of second part
              const secondWords = secondPart.split(' ')
              if (secondWords.length > 1) {
                const lastWord = secondWords[secondWords.length - 1]
                const combined = `${firstPart} ${lastWord}`
                allOptions.push(combined) // "Chicken Broth"
              }
              
              // Also try the full second part
              allOptions.push(secondPart) // "Vegetable Broth"
            } else {
              // Fallback to original logic for other cases
              allOptions.push(trimmedPart)
            }
          }
        }
        
        // Remove duplicates while preserving order
        const uniqueOptions = []
        const seen = new Set()
        for (const option of allOptions) {
          if (!seen.has(option.toLowerCase())) {
            seen.add(option.toLowerCase())
            uniqueOptions.push(option)
          }
        }
        
        console.log('Options from parentheses "or" parsing:', allOptions)
        console.log('Unique options from parentheses "or" parsing:', uniqueOptions)
        return uniqueOptions.filter(term => term.trim().length > 0)
      }
      
      return [cleanedFullIngredient].filter(term => term.trim().length > 0)
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
        // Try the full part first (e.g., "chicken broth", "vegetable broth")
        allOptions.push(trimmedPart)
        
        // Also try just the last word as fallback (e.g., "broth")
        const words = trimmedPart.split(' ').filter(word => word.length > 2)
        if (words.length >= 1) {
          allOptions.push(words[words.length - 1])
        }
        
        // For "chicken or vegetable broth", also try "chicken" and "vegetable" separately
        if (words.length >= 2) {
          allOptions.push(words[words.length - 2]) // "chicken" or "vegetable"
        }
      }
    }
    // Remove duplicates while preserving order
    const uniqueOptions = []
    const seen = new Set()
    for (const option of allOptions) {
      if (!seen.has(option.toLowerCase())) {
        seen.add(option.toLowerCase())
        uniqueOptions.push(option)
      }
    }
    
    console.log('Options from "or" parsing:', allOptions)
    console.log('Unique options from "or" parsing:', uniqueOptions)
    return uniqueOptions.filter(term => term.trim().length > 0)
  }

  // Split into words and find the main ingredient noun
  const filteredWords = cleanedText.split(' ').filter(word => 
    word.length > 2 && 
    !/^\d+$/.test(word) && // not just numbers
    !/^(and|or|the|a|an|of|in|on|at|to|for|with|by|other|wide|noodle|chicken|vegetable|broth|salt|pepper|black|white|red|yellow|blue|purple|orange|pink|brown|gray|grey|bottles|bottle|such|as|at|room|temperature|rind)$/i.test(word) // common words and colors (removed bacon, pancetta, and green from exclusion list)
  )

  // The main ingredient detection - look for common patterns
  const fallbackIngredients = []
  
  // Look for common single-word ingredients first
  const commonIngredients = ['eggs', 'ziti', 'mozzarella', 'parsley', 'garlic', 'onion', 'carrot', 'celery', 'tomato', 'cheese', 'bread', 'milk', 'butter', 'oil', 'salt', 'pepper', 'sugar', 'flour', 'rice', 'pasta', 'meat', 'chicken', 'beef', 'pork', 'fish', 'shrimp', 'lobster', 'crab', 'lamb', 'turkey', 'duck', 'veal', 'ham', 'bacon', 'sausage', 'pepperoni', 'salami', 'prosciutto', 'pancetta', 'guanciale', 'chorizo', 'andouille', 'kielbasa', 'bratwurst', 'flakes', 'parmesan', 'cutlets', 'zucchini', 'cumin', 'seeds', 'chillies', 'chili', 'peppers', 'turmeric', 'garam', 'masala', 'powder']
  
  // Check if any common ingredients are in the text
  for (const commonIngredient of commonIngredients) {
    if (cleanedText.toLowerCase().includes(commonIngredient.toLowerCase())) {
      fallbackIngredients.push(commonIngredient)
      break // Take the first match
    }
  }
  
  // Two-word lookup already done above with light cleaning

  // If still no matches, fall back to last words
  if (fallbackIngredients.length === 0) {
    if (filteredWords.length >= 2) {
      // Try the last two words (e.g., "olive oil", "pecorino romano")
      const lastTwoWords = filteredWords.slice(-2).join(' ')
      fallbackIngredients.push(lastTwoWords)
    }
    
    if (filteredWords.length >= 1) {
      // Try the last word (e.g., "garlic", "onion", "carrot", "celery")
      const lastWord = filteredWords[filteredWords.length - 1]
      fallbackIngredients.push(lastWord)
    }
  }
  
  console.log('Fallback ingredients:', fallbackIngredients)
  
  const filteredIngredients = fallbackIngredients.filter(term => term.trim().length > 0)
  console.log('Filtered potential ingredients:', filteredIngredients)
  
  return filteredIngredients
}
