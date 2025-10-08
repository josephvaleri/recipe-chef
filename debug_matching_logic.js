// Debug the matching logic for recipe 658
// Run this in your browser console on the recipe chef site

async function debugRecipe658Matching() {
  try {
    console.log('🔍 Debugging recipe 658 ingredient matching...')
    
    // 1. Get the raw ingredients for recipe 658
    const { data: rawIngredients, error: rawError } = await supabase
      .from('user_recipe_ingredients')
      .select('raw_name, amount, unit')
      .eq('user_recipe_id', 658)
    
    if (rawError) {
      console.error('Error loading raw ingredients:', rawError)
      return
    }
    
    console.log('📝 Raw ingredients found:', rawIngredients)
    
    // 2. Get all available ingredients for matching
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
      return
    }
    
    console.log('🗃️ Total ingredients in database:', allIngredients.length)
    
    // 3. Test matching logic for each raw ingredient
    const testIngredients = [
      '1 Carrot, Diced',
      '1 Onion, Peeled & Diced', 
      '1 Stalk Celery, Diced',
      '4 Tablespoons Chopped Pancetta',
      '3 Cloves Garlic, Peeled & Minced'
    ]
    
    for (const rawIngredient of testIngredients) {
      console.log(`\n🧪 Testing: "${rawIngredient}"`)
      
      const rawName = rawIngredient.toLowerCase().trim()
      let bestMatch = null
      let bestScore = 0
      const candidates = []
      
      for (const ingredient of allIngredients) {
        const ingredientName = ingredient.name.toLowerCase()
        
        // Exact match
        if (ingredientName === rawName) {
          bestMatch = ingredient
          bestScore = 1.0
          break
        }
        
        // Check if raw name contains ingredient name or vice versa
        if (rawName.includes(ingredientName) || ingredientName.includes(rawName)) {
          const score = Math.min(ingredientName.length, rawName.length) / Math.max(ingredientName.length, rawName.length)
          candidates.push({ ingredient, score })
          
          if (score > bestScore && score > 0.5) {
            bestMatch = ingredient
            bestScore = score
          }
        }
      }
      
      if (bestMatch && bestScore > 0.5) {
        console.log(`✅ MATCHED: "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`)
      } else {
        console.log(`❌ NO MATCH FOUND`)
        console.log('   Top candidates:', candidates
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(c => `"${c.ingredient.name}" (${c.score.toFixed(2)})`)
        )
      }
    }
    
    // 4. Check what was actually saved for recipe 658
    const { data: savedIngredients, error: savedError } = await supabase
      .from('user_recipe_ingredients_detail')
      .select(`
        original_text,
        matched_term,
        match_type,
        matched_alias,
        ingredients(name)
      `)
      .eq('user_recipe_id', 658)
    
    if (savedError) {
      console.error('Error loading saved ingredients:', savedError)
      return
    }
    
    console.log('\n💾 Actually saved detailed ingredients:', savedIngredients)
    
  } catch (error) {
    console.error('Debug error:', error)
  }
}

// Run the debug
debugRecipe658Matching()
