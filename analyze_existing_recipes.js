// Script to analyze existing recipes that don't have detailed ingredients
// Run this in your browser console on the recipe chef site

async function analyzeExistingRecipes() {
  try {
    // Get all user recipes that don't have detailed ingredients
    const { data: recipes, error: recipesError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title')
      .not('user_recipe_id', 'in', 
        supabase
          .from('user_recipe_ingredients_detail')
          .select('user_recipe_id')
      )

    if (recipesError) {
      console.error('Error loading recipes:', recipesError)
      return
    }

    console.log(`Found ${recipes.length} recipes without detailed ingredients`)

    // Analyze each recipe
    for (const recipe of recipes) {
      console.log(`Analyzing recipe: ${recipe.title}`)
      
      try {
        const response = await fetch('/api/ingredients/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_recipe_id: recipe.user_recipe_id }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`✅ ${recipe.title}: ${result.matched_count} matched, ${result.unmatched_count} unmatched`)
        } else {
          console.error(`❌ ${recipe.title}: Failed to analyze`)
        }
      } catch (error) {
        console.error(`❌ ${recipe.title}: Error -`, error)
      }
    }

    console.log('Analysis complete!')
  } catch (error) {
    console.error('Script error:', error)
  }
}

// Run the analysis
analyzeExistingRecipes()
