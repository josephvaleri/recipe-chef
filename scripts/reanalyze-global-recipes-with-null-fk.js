const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const BATCH_SIZE = 5
const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function reanalyzeGlobalRecipesWithNullFK() {
  try {
    console.log('🔍 Finding GLOBAL recipes with NULL FK in detail records...\n')

    // Step 1: Find all global recipes that have detail records with NULL FK
    const { data: recipesToReanalyze, error: findError } = await supabase
      .from('global_recipes')
      .select(`
        recipe_id,
        title,
        global_recipe_ingredients_detail!inner(
          id,
          global_recipe_ingredient_id
        )
      `)
      .is('global_recipe_ingredients_detail.global_recipe_ingredient_id', null)
    
    if (findError) {
      console.error('❌ Error finding recipes:', findError)
      return
    }

    // Get unique recipes (since join returns multiple rows)
    const uniqueRecipes = Array.from(
      new Map(
        recipesToReanalyze?.map(r => [r.recipe_id, r]) || []
      ).values()
    )

    console.log(`📊 Found ${uniqueRecipes.length} GLOBAL recipes with NULL FK detail records\n`)

    if (uniqueRecipes.length === 0) {
      console.log('✅ No global recipes need re-analysis!')
      return
    }

    // Show the list
    console.log('📋 Global recipes to re-analyze:')
    uniqueRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. [${recipe.recipe_id}] ${recipe.title}`)
    })
    console.log('')

    // Process in batches
    const results = {
      success: [],
      failed: [],
      skipped: []
    }

    for (let i = 0; i < uniqueRecipes.length; i += BATCH_SIZE) {
      const batch = uniqueRecipes.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(uniqueRecipes.length / BATCH_SIZE)
      
      console.log(`\n🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} recipes)...\n`)

      for (const recipe of batch) {
        console.log(`   Processing: [${recipe.recipe_id}] ${recipe.title}`)
        
        try {
          // Step 1: Check if recipe has ingredients in global_recipe_ingredients
          const { data: globalIngredients, error: ingredientsError } = await supabase
            .from('global_recipe_ingredients')
            .select('id, amount, unit, ingredient_id')
            .eq('recipe_id', recipe.recipe_id)
          
          if (ingredientsError || !globalIngredients || globalIngredients.length === 0) {
            console.log(`   ⚠️  SKIPPED: No ingredients found in global_recipe_ingredients`)
            results.skipped.push({
              recipe_id: recipe.recipe_id,
              title: recipe.title,
              reason: 'No structured ingredients'
            })
            continue
          }

          // Step 2: Delete ALL old detail records to allow clean re-creation
          const { error: deleteError } = await supabase
            .from('global_recipe_ingredients_detail')
            .delete()
            .eq('recipe_id', recipe.recipe_id)
          
          if (deleteError) {
            console.log(`   ❌ Failed to delete old detail records: ${deleteError.message}`)
            results.failed.push({
              recipe_id: recipe.recipe_id,
              title: recipe.title,
              error: deleteError.message
            })
            continue
          }

          // Step 3: Re-create detail records with FK
          // For global recipes, we create 1-to-1 mapping since they already have ingredient_id
          const detailRecords = globalIngredients.map(ing => ({
            recipe_id: recipe.recipe_id,
            global_recipe_ingredient_id: ing.id, // ← SET THE FK!
            ingredient_id: ing.ingredient_id,
            original_text: `${ing.amount || ''} ${ing.unit || ''}`.trim(),
            matched_term: null, // Will be filled from ingredients table
            match_type: 'exact'
          }))

          // Get ingredient names for matched_term
          const ingredientIds = globalIngredients.map(ing => ing.ingredient_id)
          const { data: ingredientNames } = await supabase
            .from('ingredients')
            .select('ingredient_id, name')
            .in('ingredient_id', ingredientIds)

          const nameMap = new Map(ingredientNames?.map(ing => [ing.ingredient_id, ing.name]) || [])

          // Fill in matched_term
          detailRecords.forEach(record => {
            record.matched_term = nameMap.get(record.ingredient_id) || 'Unknown'
          })

          const { error: insertError } = await supabase
            .from('global_recipe_ingredients_detail')
            .insert(detailRecords)

          if (insertError) {
            console.log(`   ❌ Failed to insert detail records: ${insertError.message}`)
            results.failed.push({
              recipe_id: recipe.recipe_id,
              title: recipe.title,
              error: insertError.message
            })
            continue
          }

          console.log(`   ✅ SUCCESS: Created ${detailRecords.length} detail records with FK`)
          results.success.push({
            recipe_id: recipe.recipe_id,
            title: recipe.title,
            ingredient_count: detailRecords.length
          })

        } catch (error) {
          console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          results.failed.push({
            recipe_id: recipe.recipe_id,
            title: recipe.title,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < uniqueRecipes.length) {
        console.log(`\n⏸️  Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`)
        await delay(DELAY_BETWEEN_BATCHES)
      }
    }

    // Final Report
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL REPORT - GLOBAL RECIPES')
    console.log('='.repeat(80))
    console.log(`\n✅ Successfully re-analyzed: ${results.success.length}`)
    console.log(`❌ Failed: ${results.failed.length}`)
    console.log(`⚠️  Skipped: ${results.skipped.length}`)

    if (results.success.length > 0) {
      console.log('\n✅ SUCCESSFUL RE-ANALYSIS:')
      results.success.forEach(r => {
        console.log(`   [${r.recipe_id}] ${r.title}`)
        console.log(`       → Created ${r.ingredient_count} detail records with FK`)
      })
    }

    if (results.failed.length > 0) {
      console.log('\n❌ FAILED:')
      results.failed.forEach(r => {
        console.log(`   [${r.recipe_id}] ${r.title}`)
        console.log(`       → Error: ${r.error}`)
      })
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  SKIPPED:')
      results.skipped.forEach(r => {
        console.log(`   [${r.recipe_id}] ${r.title}`)
        console.log(`       → Reason: ${r.reason}`)
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('🎉 Process complete!')
    console.log('='.repeat(80))
    console.log('\n📝 NEXT STEPS:')
    console.log('   1. Review the global recipes listed above')
    console.log('   2. Users who add these to cookbook will get FK preserved')
    console.log('   3. Shopping lists will work correctly for these recipes')
    console.log('\n💡 NOTE: This creates 1-to-1 detail records since global recipes')
    console.log('   already have structured ingredient_id data.')
    console.log('')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
reanalyzeGlobalRecipesWithNullFK()

