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
      const BATCH_SIZE = 5 // Reduced from 10 to prevent crashes
      const batches = []
      for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
        batches.push(ingredients.slice(i, i + BATCH_SIZE))
      }

      for (let i = 0; i < batches.length; i++) {
        try {
          console.log(`API: Processing batch ${i + 1}/${batches.length}`)
          const batchResults = await processBatch(batches[i], supabase)
          matchedIngredients.push(...batchResults.matched)
          unmatchedIngredients.push(...batchResults.unmatched)
          console.log(`API: Batch ${i + 1} complete. Matched: ${batchResults.matched.length}, Unmatched: ${batchResults.unmatched.length}`)
        } catch (batchError) {
          console.error(`Error processing batch ${i + 1}:`, batchError)
          // Add all items from failed batch to unmatched
          unmatchedIngredients.push(...batches[i])
        }
      }

      // Deduplicate matched ingredients by ingredient_id
      const seenIngredientIds = new Set()
      const uniqueMatchedIngredients = matchedIngredients.filter(ingredient => {
        if (seenIngredientIds.has(ingredient.ingredient_id)) {
          console.log(`Removing duplicate: ${ingredient.name} (ID: ${ingredient.ingredient_id})`)
          return false
        }
        seenIngredientIds.add(ingredient.ingredient_id)
        return true
      })

      // Group matched ingredients by category
      const groupedIngredients = uniqueMatchedIngredients.reduce((acc, ingredient) => {
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
        total_matched: uniqueMatchedIngredients.length,
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

    try {
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
        const searchTerms = [searchQuery]
        
        // Smart plural/singular handling
        if (searchQuery.endsWith('ies')) {
          // berries -> berry, chilies -> chili, chilies -> chiles
          searchTerms.push(searchQuery.replace(/ies$/, 'y'))
          searchTerms.push(searchQuery.replace(/ies$/, 'i'))
          searchTerms.push(searchQuery.replace(/ies$/, 'es'))
        } else if (searchQuery.endsWith('es')) {
          // potatoes -> potato, tomatoes -> tomato
          searchTerms.push(searchQuery.replace(/es$/, ''))
          searchTerms.push(searchQuery.replace(/s$/, ''))
        } else if (searchQuery.endsWith('s')) {
          // onions -> onion
          searchTerms.push(searchQuery.replace(/s$/, ''))
        } else {
          // Handle pluralization
          if (searchQuery.endsWith('y')) {
            searchTerms.push(searchQuery.replace(/y$/, 'ies')) // berry -> berries
          } else if (searchQuery.endsWith('o') || searchQuery.endsWith('i')) {
            searchTerms.push(searchQuery + 'es') // potato -> potatoes, chili -> chiles
          }
          // Always try just adding 's'
          searchTerms.push(searchQuery + 's')
        }
        
        console.log(`processBatch: Trying singular/plural variations: ${searchTerms.join(', ')}`)
        
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
        // Since we only do strict matching (exact + singular/plural), all matches are considered 'exact'
        const matchType = 'exact'
        
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
          
          // Try to find the ingredient by name (case insensitive) with singular/plural variations
          let { data: ingredientMatches, error: ingredientError } = await supabase
            .from('ingredients')
            .select(`
              ingredient_id,
              name,
              category_id,
              category:ingredient_categories(name)
            `)
            .ilike('name', twoWordName)
            .limit(1)
          
          // If not found, try singular/plural variations
          if (!ingredientMatches || ingredientMatches.length === 0) {
            const words = twoWordName.split(' ')
            const lastWord = words[words.length - 1]
            const variations = []
            
            // Try singular forms (remove 's' or 'es')
            if (lastWord.endsWith('ies')) {
              // chilies -> chili, chilies -> chiles, berries -> berry
              const singularI = lastWord.replace(/ies$/, 'i')  // chilies -> chili
              const singularES = lastWord.replace(/ies$/, 'es')  // chilies -> chiles
              const singularY = lastWord.replace(/ies$/, 'y')  // berries -> berry
              variations.push(words.slice(0, -1).join(' ') + ' ' + singularI)
              if (singularES !== singularI && singularES !== singularY) {
                variations.push(words.slice(0, -1).join(' ') + ' ' + singularES)
              }
              if (singularY !== singularI) {
                variations.push(words.slice(0, -1).join(' ') + ' ' + singularY)
              }
            } else if (lastWord.endsWith('es')) {
              // tomatoes -> tomato
              const singularLastWord = lastWord.replace(/es$/, '')
              variations.push(words.slice(0, -1).join(' ') + ' ' + singularLastWord)
              // Also try removing just 's'
              const singularLastWordS = lastWord.replace(/s$/, '')
              if (singularLastWordS !== singularLastWord) {
                variations.push(words.slice(0, -1).join(' ') + ' ' + singularLastWordS)
              }
            } else if (lastWord.endsWith('s')) {
              // onions -> onion
              const singularLastWord = lastWord.replace(/s$/, '')
              variations.push(words.slice(0, -1).join(' ') + ' ' + singularLastWord)
            }
            
            // Try plural forms (add 's' or 'es')
            if (!lastWord.endsWith('s')) {
              if (lastWord.endsWith('y')) {
                // chili -> chilies
                const pluralLastWord = lastWord.replace(/y$/, 'ies')
                variations.push(words.slice(0, -1).join(' ') + ' ' + pluralLastWord)
              } else if (lastWord.endsWith('i')) {
                // chili -> chiles (special case for words ending in 'i')
                const pluralES = lastWord + 'es'
                variations.push(words.slice(0, -1).join(' ') + ' ' + pluralES)
              } else if (lastWord.endsWith('o') || lastWord.endsWith('ch') || lastWord.endsWith('sh') || lastWord.endsWith('x') || lastWord.endsWith('z')) {
                // tomato -> tomatoes
                const pluralLastWord = lastWord + 'es'
                variations.push(words.slice(0, -1).join(' ') + ' ' + pluralLastWord)
              }
              // Also always try just adding 's'
              variations.push(words.slice(0, -1).join(' ') + ' ' + lastWord + 's')
            }
            
            if (variations.length > 0) {
              console.log(`processBatch: Trying singular/plural variations for two-word ingredient: ${variations.join(', ')}`)
              const { data: variationMatches } = await supabase
                .from('ingredients')
                .select(`
                  ingredient_id,
                  name,
                  category_id,
                  category:ingredient_categories(name)
                `)
                .or(variations.map(v => `name.ilike.${v}`).join(','))
                .limit(1)
              
              if (variationMatches && variationMatches.length > 0) {
                ingredientMatches = variationMatches
                console.log(`processBatch: Found with variation: ${variationMatches[0].name}`)
              }
            }
          }
          
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
    } catch (parseError) {
      console.error(`Error parsing ingredient "${ingredientText}":`, parseError)
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
    .replace(/[.;]/g, '') // Remove periods and semicolons
    .replace(/\d+\/\d+/g, '') // Remove fractions
    .replace(/\d+/g, '') // Remove numbers  
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\b(lbs?|pounds?|cups?|tablespoons?|tsp|tbsp|oz|ounces?|grams?|g|ml|liters?)\b/g, '') // Remove units
    .replace(/\s+/g, ' ')
    .trim()
  
  console.log('Light cleaned text for two-word lookup:', lightCleaned)
  
  const lightWords = lightCleaned.split(' ')
  
  // Check for two-word combinations in lightly cleaned text
  // Limit to first 6 two-word combinations to catch ingredients like "chicken broth" in "cans reduced-sodium chicken broth"
  const maxTwoWordChecks = Math.min(lightWords.length - 1, 6)
  for (let i = 0; i < maxTwoWordChecks; i++) {
    const twoWord = `${lightWords[i]} ${lightWords[i + 1]}`
    
    // Try exact match first
    let { data: twoWordMatches } = await supabase
      .from('two_word_ingredients')
      .select('ingredient_name')
      .ilike('ingredient_name', twoWord)
    
    // If no match, try singular/plural variations
    if (!twoWordMatches || twoWordMatches.length === 0) {
      const words = twoWord.split(' ')
      const lastWord = words[words.length - 1]
      const variations = []
      
      // Try singular forms (remove 's' or 'es' from last word)
      if (lastWord.endsWith('ies')) {
        // chilies -> chili (remove 'es'), chilies -> chiles (replace 'ies' with 'es'), berries -> berry (replace 'ies' with 'y')
        // Try all variations
        const singularI = lastWord.replace(/ies$/, 'i')  // chilies -> chili
        const singularES = lastWord.replace(/ies$/, 'es')  // chilies -> chiles
        const singularY = lastWord.replace(/ies$/, 'y')  // berries -> berry
        variations.push(words.slice(0, -1).join(' ') + ' ' + singularI)
        if (singularES !== singularI && singularES !== singularY) {
          variations.push(words.slice(0, -1).join(' ') + ' ' + singularES)
        }
        if (singularY !== singularI) {
          variations.push(words.slice(0, -1).join(' ') + ' ' + singularY)
        }
      } else if (lastWord.endsWith('es')) {
        // tomatoes -> tomato, potatoes -> potato
        const singularLastWord = lastWord.replace(/es$/, '')
        variations.push(words.slice(0, -1).join(' ') + ' ' + singularLastWord)
        // Also try removing just 's' in case it's like "olives" -> "olive"
        const singularLastWordS = lastWord.replace(/s$/, '')
        if (singularLastWordS !== singularLastWord) {
          variations.push(words.slice(0, -1).join(' ') + ' ' + singularLastWordS)
        }
      } else if (lastWord.endsWith('s')) {
        // onions -> onion
        const singularLastWord = lastWord.replace(/s$/, '')
        variations.push(words.slice(0, -1).join(' ') + ' ' + singularLastWord)
      }
      
      // Try plural forms (add 's' or 'es' to last word)
      if (!lastWord.endsWith('s')) {
        if (lastWord.endsWith('y')) {
          // chili -> chilies
          const pluralLastWord = lastWord.replace(/y$/, 'ies')
          variations.push(words.slice(0, -1).join(' ') + ' ' + pluralLastWord)
        } else if (lastWord.endsWith('i')) {
          // chili -> chiles (special case for words ending in 'i')
          const pluralES = lastWord + 'es'
          variations.push(words.slice(0, -1).join(' ') + ' ' + pluralES)
        } else if (lastWord.endsWith('o') || lastWord.endsWith('ch') || lastWord.endsWith('sh') || lastWord.endsWith('x') || lastWord.endsWith('z')) {
          // tomato -> tomatoes, potato -> potatoes
          const pluralLastWord = lastWord + 'es'
          variations.push(words.slice(0, -1).join(' ') + ' ' + pluralLastWord)
        }
        // Also always try just adding 's'
        const pluralLastWordS = lastWord + 's'
        variations.push(words.slice(0, -1).join(' ') + ' ' + pluralLastWordS)
      }
      
      if (variations.length > 0) {
        // Limit variations to prevent excessive queries
        const limitedVariations = variations.slice(0, 3)
        console.log(`Trying singular/plural variations for "${twoWord}": ${limitedVariations.join(', ')}`)
        
        for (const variation of limitedVariations) {
          const { data: variationMatches } = await supabase
            .from('two_word_ingredients')
            .select('ingredient_name')
            .ilike('ingredient_name', variation)
          
          if (variationMatches && variationMatches.length > 0) {
            twoWordMatches = variationMatches
            console.log(`Found two-word ingredient (variation): "${variation}" for "${twoWord}"`)
            break
          }
        }
      }
    }
    
    if (twoWordMatches && twoWordMatches.length > 0) {
      potentialIngredients.push(twoWordMatches[0].ingredient_name)
      console.log('Found two-word ingredient from light cleaning:', twoWordMatches[0].ingredient_name)
      return potentialIngredients // Return early if found
    }
  }
  
  // STEP 2: Enhanced cleaning for single words and fallbacks
  // Enhanced cleaning - remove measurements, quantities, and descriptive words
  let cleanedText = text
    .replace(/[.;]/g, '') // Remove periods and semicolons
    .replace(/\b\d+\.?\d*\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')
    .replace(/\b\d+\.?\d*\s*-\s*\d+\.?\d*\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')
    .replace(/\bounce\b/gi, '')  // Remove standalone "ounce" that might be left over
    .replace(/\b\d+\.?\d*\b/g, '')  // Remove standalone numbers (including decimals)
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|kg|kilogram|kilograms|g|gram|grams|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|piece|pieces|bottle|bottles|can|cans|jar|jars|box|boxes|bag|bags|package|packages)\b/gi, '')  // Remove Unicode fractions with units
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, '')  // Remove standalone Unicode fractions
    .replace(/\b(for|to|taste|serving|garnish|optional|as needed|cut|crosswise|into|julienned|sliced|crushed|chopped|grated|plus|more|large|medium|small|whole|half|halved|quarter|quartered|extra|virgin|extra-virgin|dried|frozen|canned|raw|cooked|other|wide|spaghetti|and|smashed|finely|thinly|thickly|peeled|diced|minced|sliced|grated|crushed|large|medium|small|dried|frozen|canned|raw|cooked|roasted|grilled|fried|boiled|steamed|braised|sauteed|inch|piece|pieces|one|two|three|four|five|six|seven|eight|nine|ten|zest|juice|juiced|removed|strips|peeler|with|of|in|link|links|bite|size|chunks|chunk|pull|out|skin|mild|cup|cups|such|as|at|room|temperature|rind|trimmed|stemmed|seeded|spiced|shredded|leaves|stems|sprigs|sprig|ripped|fine|ok|bought|store|hash|browns|reduced|sodium|neck|necks|giblets|giblet|discarded|firm|tender|fresh|freshly|squeezed|strained|pulp|enough|cover|cubed|cubes|bodies|body|squares|square|rounds|round)\b/gi, '')
    .replace(/[,\-&();]/g, ' ')  // Replace commas, dashes, ampersands, parentheses, semicolons with spaces
    .replace(/\s+/g, ' ')
    .trim()

  console.log('Cleaned text:', cleanedText)
  
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
    !/^(and|or|the|a|an|of|in|on|at|to|for|with|by|other|wide|noodle|salt|pepper|black|white|red|yellow|blue|purple|pink|brown|gray|grey|bottles|bottle|such|as|at|room|temperature|rind|cans)$/i.test(word) // common words and colors - removed chicken, vegetable, broth, and orange from exclusion list
  )

  // The main ingredient detection - look for common patterns
  const fallbackIngredients = []
  
  // Look for common TWO-WORD ingredients FIRST (to avoid matching "chicken" when we want "chicken broth" or "roasting chicken")
  const commonTwoWordIngredients = [
    'chicken broth', 'beef broth', 'vegetable broth', 'chicken stock', 'beef stock', 'vegetable stock',
    'roasting chicken', 'whole chicken', 'chicken breast', 'chicken thigh', 'chicken wings', 'chicken drumsticks',
    'ground beef', 'ground pork', 'ground turkey', 'pork chops', 'beef roast',
    'lobster meat', 'crab meat', 'shrimp meat',
    'white fish', 'fish fillets', 'fish fillet', 'cod fillets', 'salmon fillets',
    'olive oil', 'coconut oil', 'sesame oil', 'vegetable oil', 'canola oil',
    'soy sauce', 'fish sauce', 'worcestershire sauce', 'hot sauce', 'tomato sauce',
    'black pepper', 'white pepper', 'red pepper', 'cayenne pepper',
    'garlic powder', 'onion powder', 'chili powder', 'curry powder',
    'baking powder', 'baking soda'
  ]
  
  // Check for two-word ingredients first
  for (const twoWordIngredient of commonTwoWordIngredients) {
    if (cleanedText.toLowerCase().includes(twoWordIngredient.toLowerCase())) {
      fallbackIngredients.push(twoWordIngredient)
      break // Take the first match
    }
  }
  
  // If no two-word match, check for single-word ingredients
  if (fallbackIngredients.length === 0) {
    const commonIngredients = ['eggs', 'ziti', 'mozzarella', 'parsley', 'cilantro', 'coriander', 'basil', 'thyme', 'rosemary', 'oregano', 'garlic', 'onion', 'carrot', 'celery', 'tomato', 'avocado', 'cheese', 'bread', 'milk', 'butter', 'oil', 'salt', 'pepper', 'sugar', 'flour', 'rice', 'pasta', 'lemon', 'lime', 'orange', 'chicken', 'beef', 'pork', 'fish', 'shrimp', 'lobster', 'crab', 'squid', 'calamari', 'octopus', 'clams', 'mussels', 'oysters', 'scallops', 'lamb', 'turkey', 'duck', 'veal', 'ham', 'bacon', 'sausage', 'meat', 'pepperoni', 'salami', 'prosciutto', 'pancetta', 'guanciale', 'chorizo', 'andouille', 'kielbasa', 'bratwurst', 'flakes', 'parmesan', 'cutlets', 'zucchini', 'cumin', 'seeds', 'chillies', 'chili', 'peppers', 'turmeric', 'garam', 'masala', 'powder', 'venison', 'beetroot', 'beet', 'cabbage', 'ancho', 'guajillo', 'ghee', 'potato', 'potatoes', 'spinach', 'broth', 'fillets', 'cod', 'salmon', 'tilapia', 'halibut', 'snapper']
    
    // Check if any common single-word ingredients are in the text
    for (const commonIngredient of commonIngredients) {
      if (cleanedText.toLowerCase().includes(commonIngredient.toLowerCase())) {
        fallbackIngredients.push(commonIngredient)
        break // Take the first match
      }
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
