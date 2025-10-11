import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { user_recipe_id } = await request.json()
    
    if (!user_recipe_id) {
      return NextResponse.json({ error: 'user_recipe_id is required' }, { status: 400 })
    }

    // Get the server-side Supabase client
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the user owns this recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title')
      .eq('user_recipe_id', user_recipe_id)
      .eq('user_id', user.id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found or access denied' }, { status: 404 })
    }

    // Get the raw ingredients from user_recipe_ingredients
    const { data: rawIngredients, error: rawError } = await supabase
      .from('user_recipe_ingredients')
      .select('id, raw_name, amount, unit')
      .eq('user_recipe_id', user_recipe_id)

    if (rawError) {
      console.error('Error loading raw ingredients:', rawError)
      return NextResponse.json({ error: 'Failed to load ingredients' }, { status: 500 })
    }

    if (!rawIngredients || rawIngredients.length === 0) {
      return NextResponse.json({ error: 'No ingredients found' }, { status: 404 })
    }

    // Get all available ingredients for matching
    const { data: allIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select(`
        ingredient_id,
        name,
        category_id,
        ingredient_categories(name)
      `)

    if (ingredientsError) {
      console.error('Error loading ingredients:', ingredientsError)
      return NextResponse.json({ error: 'Failed to load ingredient database' }, { status: 500 })
    }

    // Enhanced matching logic - find exact matches and similar names
    const matchedIngredients = []
    const unmatchedIngredients = []

    for (const rawIngredient of rawIngredients) {
      const rawName = rawIngredient.raw_name?.toLowerCase().trim()
      if (!rawName) continue

      // Clean the raw name - remove common descriptors
      const cleanRawName = rawName
        // Remove measurements and numbers
        .replace(/\b\d+([/-]\d+)?(\s*(inch|inches|cm|centimeter|centimeters|mm))?\b/g, '')
        
        // Remove volume units
        .replace(/\b(cup|cups|c|tablespoon|tablespoons|tbsp|tbs|tb|teaspoon|teaspoons|tsp|ts|fluid\s*ounce|fluid\s*ounces|fl\.?\s*oz|pint|pints|pt|quart|quarts|qt|gallon|gallons|gal|milliliter|milliliters|millilitre|millilitres|ml|liter|liters|litre|litres|l|deciliter|deciliters|dl)\b/gi, '')
        
        // Remove weight units
        .replace(/\b(pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|gramme|grammes|g|kilogram|kilograms|kg|milligram|milligrams|mg)\b/gi, '')
        
        // Remove portion/count units
        .replace(/\b(clove|cloves|stalk|stalks|stick|sticks|piece|pieces|chunk|chunks|strip|strips|wedge|wedges|slice|slices|head|heads|bunch|bunches|sprig|sprigs|leaf|leaves|bulb|bulbs|can|cans|jar|jars|package|packages|pkg|box|boxes|bag|bags|container|containers)\b/gi, '')
        
        // Remove cutting/prep styles
        .replace(/\b(diced|chopped|peeled|minced|sliced|grated|shredded|crushed|mashed|pureed|ground|crumbled|julienned|ribboned|cubed|halved|quartered|sectioned|segmented|torn|broken)\b/gi, '')
        
        // Remove cutting instructions
        .replace(/\b(cut|cutting|slice|slicing|chop|chopping|dice|dicing|mince|mincing|into|in|to|about|approximately)\b/gi, '')
        
        // Remove prep actions
        .replace(/\b(washed|rinsed|cleaned|scrubbed|dried|drained|patted|trimmed|deveined|deseeded|pitted|cored|stemmed|husked|shucked|picked|sorted)\b/gi, '')
        
        // Remove cooking states
        .replace(/\b(fresh|freshly|dried|frozen|defrosted|thawed|bottled|packaged|jarred|smoked|cured|aged)\b/gi, '')
        
        // Remove cooking methods
        .replace(/\b(raw|cooked|uncooked|precooked|blanched|parboiled|steamed|boiled|simmered|poached|roasted|baked|grilled|broiled|fried|sauteed|sautéed|pan-fried|deep-fried|stir-fried|braised|stewed|caramelized)\b/gi, '')
        
        // Remove quality/source descriptors
        .replace(/\b(organic|non-organic|natural|wild|farm-raised|free-range|grass-fed|hormone-free|antibiotic-free|gmo-free|non-gmo|gluten-free|low-sodium|no-salt|unsalted|salted|sweetened|unsweetened|sugar-free)\b/gi, '')
        
        // Remove temperature/texture descriptors
        .replace(/\b(cold|hot|warm|room\s*temperature|chilled|refrigerated|softened|melted|hardened|firm|soft|tender|crisp|crispy|crunchy)\b/gi, '')
        
        // Remove adverbs and intensifiers
        .replace(/\b(very|extra|super|ultra|lightly|slightly|moderately|highly|well|thoroughly|completely|fully|partly|partially|finely|coarsely|roughly|thinly|thickly)\b/gi, '')
        
        // Remove size descriptors
        .replace(/\b(large|medium|small|mini|baby|jumbo|giant|extra-large|x-large|xl|extra-small|x-small|xs|bite-sized|bite-size)\b/gi, '')
        
        // Remove color descriptors (for produce)
        .replace(/\b(red|green|yellow|orange|purple|white|black|brown|golden|dark|light|pale)\b/gi, '')
        
        // Remove ripeness/age descriptors
        .replace(/\b(ripe|unripe|overripe|mature|young|new|old|aged|day-old)\b/gi, '')
        
        // Remove origin/variety descriptors (common ones)
        .replace(/\b(italian|french|spanish|mexican|asian|chinese|japanese|thai|indian|greek|mediterranean|english|american)\b/gi, '')
        
        // Remove "parts" language
        .replace(/\b(top|bottom|end|ends|tip|tips|root|roots|skin|peel|flesh|meat|bone|bones|boneless|skinless|seedless)\b/gi, '')
        
        // Remove optional/preference words
        .replace(/\b(optional|to\s*taste|as\s*needed|for\s*serving|for\s*garnish|if\s*desired|preferably|ideally)\b/gi, '')
        
        // Remove conjunctions and articles
        .replace(/\b(and|or|with|without|plus|a|an|the|of|from|for|on|at|by)\b/gi, '')
        
        // Remove parenthetical content (often contains alternatives or notes)
        .replace(/\([^)]*\)/g, '')
        
        // Remove bracket content
        .replace(/\[[^\]]*\]/g, '')
        
        // Replace punctuation with spaces
        .replace(/[,\-–—&/]/g, ' ')
        
        // Collapse multiple spaces into one
        .replace(/\s+/g, ' ')
        
        // Final trim
        .trim()

      // Try to find exact match first
      let bestMatch = null
      let bestScore = 0

      for (const ingredient of allIngredients || []) {
        const ingredientName = ingredient.name.toLowerCase()
        
        // Exact match with original name
        if (ingredientName === rawName) {
          bestMatch = ingredient
          bestScore = 1.0
          break
        }
        
        // Exact match with cleaned name
        if (ingredientName === cleanRawName) {
          bestMatch = ingredient
          bestScore = 0.95
          break
        }
        
        // Handle plural/singular variations
        const isPlural = cleanRawName.endsWith('s') && ingredientName === cleanRawName.slice(0, -1)
        const isSingular = ingredientName.endsWith('s') && cleanRawName === ingredientName.slice(0, -1)
        if (isPlural || isSingular) {
          bestMatch = ingredient
          bestScore = 0.9
          break
        }
        
        // Check if cleaned raw name contains ingredient name
        if (cleanRawName.includes(ingredientName)) {
          const score = ingredientName.length / cleanRawName.length
          if (score > bestScore && score > 0.6) {
            bestMatch = ingredient
            bestScore = score
          }
        }
        
        // Check if ingredient name contains cleaned raw name
        if (ingredientName.includes(cleanRawName)) {
          const score = cleanRawName.length / ingredientName.length
          if (score > bestScore && score > 0.6) {
            bestMatch = ingredient
            bestScore = score
          }
        }
        
        // Partial match (contains) with original name
        if (ingredientName.includes(rawName) || rawName.includes(ingredientName)) {
          const score = Math.min(ingredientName.length, rawName.length) / Math.max(ingredientName.length, rawName.length)
          if (score > bestScore && score > 0.5) {
            bestMatch = ingredient
            bestScore = score
          }
        }
      }

      if (bestMatch && bestScore > 0.5) {
        matchedIngredients.push({
          user_recipe_id,
          user_recipe_ingredient_id: rawIngredient.id,
          ingredient_id: bestMatch.ingredient_id,
          original_text: rawIngredient.raw_name,
          matched_term: bestMatch.name,
          match_type: bestScore >= 0.95 ? 'exact' : 'alias',
          matched_alias: bestScore < 0.95 ? bestMatch.name : null
        })
      } else {
        unmatchedIngredients.push(rawIngredient.raw_name)
      }
    }

    // Save the matched ingredients to user_recipe_ingredients_detail
    if (matchedIngredients.length > 0) {
      console.log(`Saving ${matchedIngredients.length} matched ingredients for recipe ${user_recipe_id}`)
      console.log('Matched ingredients:', matchedIngredients.map(m => `${m.original_text} → ${m.matched_term}`))
      
      const { error: saveError } = await supabase
        .from('user_recipe_ingredients_detail')
        .insert(matchedIngredients)

      if (saveError) {
        console.error('Error saving matched ingredients:', saveError)
        return NextResponse.json({ error: 'Failed to save matched ingredients' }, { status: 500 })
      }
      
      console.log(`Successfully saved ${matchedIngredients.length} ingredients`)
    } else {
      console.log('No ingredients matched for recipe', user_recipe_id)
    }

    return NextResponse.json({
      success: true,
      matched_count: matchedIngredients.length,
      unmatched_count: unmatchedIngredients.length,
      matched_ingredients: matchedIngredients,
      unmatched_ingredients: unmatchedIngredients
    })

  } catch (error) {
    console.error('Analyze ingredients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
