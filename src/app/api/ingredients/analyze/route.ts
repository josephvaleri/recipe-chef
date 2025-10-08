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
      .select('raw_name, amount, unit')
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
        .replace(/\b\d+\b/g, '') // Remove numbers
        .replace(/\b(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|clove|cloves|stalk|stalks|diced|chopped|peeled|minced|sliced|grated|shredded|crushed|whole|large|medium|small|fresh|dried|frozen|canned|organic|raw|cooked|roasted|grilled|fried|boiled|steamed)\b/g, '')
        .replace(/[,\-&]/g, ' ') // Replace commas, dashes, ampersands with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
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
