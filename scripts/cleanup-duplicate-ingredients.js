const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupDuplicateIngredients() {
  try {
    console.log('🧹 Cleaning up duplicate global recipe ingredients...\n')

    // Get all global recipe ingredients
    const { data: allIngredients, error: fetchError } = await supabase
      .from('global_recipe_ingredients')
      .select('*')
      .order('recipe_id, id')

    if (fetchError) {
      console.error('❌ Error fetching ingredients:', fetchError)
      return
    }

    console.log(`📊 Found ${allIngredients.length} total ingredient records`)

    // Group by recipe_id
    const groupedByRecipe = {}
    allIngredients.forEach(ingredient => {
      if (!groupedByRecipe[ingredient.recipe_id]) {
        groupedByRecipe[ingredient.recipe_id] = []
      }
      groupedByRecipe[ingredient.recipe_id].push(ingredient)
    })

    let duplicatesRemoved = 0

    // Process each recipe
    for (const [recipeId, ingredients] of Object.entries(groupedByRecipe)) {
      console.log(`\n🔍 Processing recipe ${recipeId} with ${ingredients.length} ingredients`)
      
      // Find the record with the longest raw_name (this should be the formatted display text)
      const sortedIngredients = ingredients.sort((a, b) => (b.raw_name?.length || 0) - (a.raw_name?.length || 0))
      
      if (sortedIngredients.length > 1) {
        console.log(`   📝 Found ${sortedIngredients.length} records, keeping the longest one`)
        console.log(`   📄 Longest raw_name: "${sortedIngredients[0].raw_name?.substring(0, 50)}..."`)
        
        // Keep the first (longest) record, delete the rest
        const toDelete = sortedIngredients.slice(1)
        
        for (const duplicate of toDelete) {
          const { error: deleteError } = await supabase
            .from('global_recipe_ingredients')
            .delete()
            .eq('id', duplicate.id)
          
          if (deleteError) {
            console.error(`   ❌ Error deleting duplicate ${duplicate.id}:`, deleteError)
          } else {
            console.log(`   ✅ Deleted duplicate record ${duplicate.id}`)
            duplicatesRemoved++
          }
        }
      } else {
        console.log(`   ✅ Only 1 record, no cleanup needed`)
      }
    }

    console.log(`\n🎉 Cleanup completed! Removed ${duplicatesRemoved} duplicate records`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

cleanupDuplicateIngredients()

