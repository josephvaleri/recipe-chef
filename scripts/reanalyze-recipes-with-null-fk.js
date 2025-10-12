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

async function reanalyzeRecipesWithNullFK() {
  try {
    console.log('🔍 Finding recipes with NULL FK in detail records...\n')

    // Step 1: Find all recipes that have detail records with NULL FK
    const { data: recipesToReanalyze, error: findError } = await supabase
      .from('user_recipes')
      .select(`
        user_recipe_id,
        title,
        user_id,
        user_recipe_ingredients_detail!inner(
          detail_id,
          user_recipe_ingredient_id
        )
      `)
      .is('user_recipe_ingredients_detail.user_recipe_ingredient_id', null)
    
    if (findError) {
      console.error('❌ Error finding recipes:', findError)
      return
    }

    // Get unique recipes (since join returns multiple rows)
    const uniqueRecipes = Array.from(
      new Map(
        recipesToReanalyze?.map(r => [r.user_recipe_id, r]) || []
      ).values()
    )

    console.log(`📊 Found ${uniqueRecipes.length} recipes with NULL FK detail records\n`)

    if (uniqueRecipes.length === 0) {
      console.log('✅ No recipes need re-analysis!')
      return
    }

    // Show the list
    console.log('📋 Recipes to re-analyze:')
    uniqueRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. [${recipe.user_recipe_id}] ${recipe.title}`)
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
        console.log(`   Processing: [${recipe.user_recipe_id}] ${recipe.title}`)
        
        try {
          // Step 1: Check if recipe has raw ingredients
          const { data: rawIngredients, error: rawError } = await supabase
            .from('user_recipe_ingredients')
            .select('id')
            .eq('user_recipe_id', recipe.user_recipe_id)
          
          if (rawError || !rawIngredients || rawIngredients.length === 0) {
            console.log(`   ⚠️  SKIPPED: No raw ingredients found`)
            results.skipped.push({
              recipe_id: recipe.user_recipe_id,
              title: recipe.title,
              reason: 'No raw ingredients'
            })
            continue
          }

          // Step 2: Delete ALL old detail records (not just NULL FK)
          // This ensures clean re-analysis without constraint violations
          const { error: deleteError } = await supabase
            .from('user_recipe_ingredients_detail')
            .delete()
            .eq('user_recipe_id', recipe.user_recipe_id)
          
          if (deleteError) {
            console.log(`   ❌ Failed to delete old detail records: ${deleteError.message}`)
            results.failed.push({
              recipe_id: recipe.user_recipe_id,
              title: recipe.title,
              error: deleteError.message
            })
            continue
          }

          // Step 3: Run ingredient analysis
          const result = await analyzeIngredients(recipe.user_recipe_id)
          
          if (result.error) {
            console.log(`   ❌ Analysis failed: ${result.error.message}`)
            results.failed.push({
              recipe_id: recipe.user_recipe_id,
              title: recipe.title,
              error: result.error.message
            })
            continue
          }

          console.log(`   ✅ SUCCESS: Matched ${result.data.matched_count}/${rawIngredients.length} ingredients`)
          if (result.data.unmatched_count > 0) {
            console.log(`       Unmatched: ${result.data.unmatched_ingredients.join(', ')}`)
          }
          
          results.success.push({
            recipe_id: recipe.user_recipe_id,
            title: recipe.title,
            matched: result.data.matched_count,
            unmatched: result.data.unmatched_count
          })

        } catch (error) {
          console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          results.failed.push({
            recipe_id: recipe.user_recipe_id,
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
    console.log('📊 FINAL REPORT')
    console.log('='.repeat(80))
    console.log(`\n✅ Successfully re-analyzed: ${results.success.length}`)
    console.log(`❌ Failed: ${results.failed.length}`)
    console.log(`⚠️  Skipped: ${results.skipped.length}`)

    if (results.success.length > 0) {
      console.log('\n✅ SUCCESSFUL RE-ANALYSIS:')
      results.success.forEach(r => {
        console.log(`   [${r.recipe_id}] ${r.title}`)
        console.log(`       → Matched: ${r.matched}, Unmatched: ${r.unmatched}`)
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
    console.log('   1. Review the recipes listed above')
    console.log('   2. Manually QA recipes in your browser')
    console.log('   3. Check shopping list generation works correctly')
    console.log('')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Inline analysis logic (same as API but with service role)
async function analyzeIngredients(user_recipe_id) {
  try {
    // Get the raw ingredients
    const { data: rawIngredients, error: rawError } = await supabase
      .from('user_recipe_ingredients')
      .select('id, raw_name, amount, unit')
      .eq('user_recipe_id', user_recipe_id)

    if (rawError || !rawIngredients || rawIngredients.length === 0) {
      return { 
        data: null, 
        error: new Error('No ingredients found') 
      }
    }

    // Get all available ingredients
    const { data: allIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('ingredient_id, name, category_id')

    if (ingredientsError) {
      return { 
        data: null, 
        error: new Error('Failed to load ingredient database') 
      }
    }

    const matchedIngredients = []
    const unmatchedIngredients = []

    for (const rawIngredient of rawIngredients) {
      const rawName = rawIngredient.raw_name?.toLowerCase().trim()
      if (!rawName) continue

      // Use the same comprehensive cleaning logic
      const cleanRawName = rawName
        .replace(/\b\d+([/-]\d+)?(\s*(inch|inches|cm|centimeter|centimeters|mm))?\b/g, '')
        .replace(/\b(cup|cups|c|tablespoon|tablespoons|tbsp|tbs|tb|teaspoon|teaspoons|tsp|ts|fluid\s*ounce|fluid\s*ounces|fl\.?\s*oz|pint|pints|pt|quart|quarts|qt|gallon|gallons|gal|milliliter|milliliters|millilitre|millilitres|ml|liter|liters|litre|litres|l|deciliter|deciliters|dl)\b/gi, '')
        .replace(/\b(pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|gramme|grammes|g|kilogram|kilograms|kg|milligram|milligrams|mg)\b/gi, '')
        .replace(/\b(clove|cloves|stalk|stalks|stick|sticks|piece|pieces|chunk|chunks|strip|strips|wedge|wedges|slice|slices|head|heads|bunch|bunches|sprig|sprigs|leaf|leaves|bulb|bulbs|can|cans|jar|jars|package|packages|pkg|box|boxes|bag|bags|container|containers)\b/gi, '')
        .replace(/\b(diced|chopped|peeled|minced|sliced|grated|shredded|crushed|mashed|pureed|ground|crumbled|julienned|ribboned|cubed|halved|quartered|sectioned|segmented|torn|broken)\b/gi, '')
        .replace(/\b(cut|cutting|slice|slicing|chop|chopping|dice|dicing|mince|mincing|into|in|to|about|approximately)\b/gi, '')
        .replace(/\b(washed|rinsed|cleaned|scrubbed|dried|drained|patted|trimmed|deveined|deseeded|pitted|cored|stemmed|husked|shucked|picked|sorted)\b/gi, '')
        .replace(/\b(fresh|freshly|dried|frozen|defrosted|thawed|bottled|packaged|jarred|smoked|cured|aged)\b/gi, '')
        .replace(/\b(raw|cooked|uncooked|precooked|blanched|parboiled|steamed|boiled|simmered|poached|roasted|baked|grilled|broiled|fried|sauteed|sautéed|pan-fried|deep-fried|stir-fried|braised|stewed|caramelized)\b/gi, '')
        .replace(/\b(organic|non-organic|natural|wild|farm-raised|free-range|grass-fed|hormone-free|antibiotic-free|gmo-free|non-gmo|gluten-free|low-sodium|no-salt|unsalted|salted|sweetened|unsweetened|sugar-free)\b/gi, '')
        .replace(/\b(cold|hot|warm|room\s*temperature|chilled|refrigerated|softened|melted|hardened|firm|soft|tender|crisp|crispy|crunchy)\b/gi, '')
        .replace(/\b(very|extra|super|ultra|lightly|slightly|moderately|highly|well|thoroughly|completely|fully|partly|partially|finely|coarsely|roughly|thinly|thickly)\b/gi, '')
        .replace(/\b(large|medium|small|mini|baby|jumbo|giant|extra-large|x-large|xl|extra-small|x-small|xs|bite-sized|bite-size)\b/gi, '')
        .replace(/\b(red|green|yellow|orange|purple|white|black|brown|golden|dark|light|pale)\b/gi, '')
        .replace(/\b(ripe|unripe|overripe|mature|young|new|old|aged|day-old)\b/gi, '')
        .replace(/\b(italian|french|spanish|mexican|asian|chinese|japanese|thai|indian|greek|mediterranean|english|american)\b/gi, '')
        .replace(/\b(top|bottom|end|ends|tip|tips|root|roots|skin|peel|flesh|meat|bone|bones|boneless|skinless|seedless)\b/gi, '')
        .replace(/\b(optional|to\s*taste|as\s*needed|for\s*serving|for\s*garnish|if\s*desired|preferably|ideally)\b/gi, '')
        .replace(/\b(and|or|with|without|plus|a|an|the|of|from|for|on|at|by)\b/gi, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/[,\-–—&/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      let bestMatch = null
      let bestScore = 0

      for (const ingredient of allIngredients || []) {
        const ingredientName = ingredient.name.toLowerCase()
        
        // Exact match
        if (ingredientName === rawName || ingredientName === cleanRawName) {
          bestMatch = ingredient
          bestScore = 1.0
          break
        }
        
        // Plural/singular
        const isPlural = cleanRawName.endsWith('s') && ingredientName === cleanRawName.slice(0, -1)
        const isSingular = ingredientName.endsWith('s') && cleanRawName === ingredientName.slice(0, -1)
        if (isPlural || isSingular) {
          bestMatch = ingredient
          bestScore = 0.9
          break
        }
        
        // Contains match
        if (cleanRawName.includes(ingredientName)) {
          const score = ingredientName.length / cleanRawName.length
          if (score > bestScore && score > 0.3) { // Lowered threshold
            bestMatch = ingredient
            bestScore = score
          }
        }
        
        if (ingredientName.includes(cleanRawName)) {
          const score = cleanRawName.length / ingredientName.length
          if (score > bestScore && score > 0.3) {
            bestMatch = ingredient
            bestScore = score
          }
        }
        
        // Partial match
        if (ingredientName.includes(rawName) || rawName.includes(ingredientName)) {
          const score = Math.min(ingredientName.length, rawName.length) / Math.max(ingredientName.length, rawName.length)
          if (score > bestScore && score > 0.3) {
            bestMatch = ingredient
            bestScore = score
          }
        }
      }

      if (bestMatch && bestScore > 0.3) {
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

    // Save matched ingredients
    if (matchedIngredients.length > 0) {
      const { error: saveError } = await supabase
        .from('user_recipe_ingredients_detail')
        .insert(matchedIngredients)

      if (saveError) {
        return { 
          data: null, 
          error: new Error(`Failed to save: ${saveError.message}`) 
        }
      }
    }

    return {
      data: {
        matched_count: matchedIngredients.length,
        unmatched_count: unmatchedIngredients.length,
        unmatched_ingredients: unmatchedIngredients
      },
      error: null
    }

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error')
    }
  }
}

// Run the script
reanalyzeRecipesWithNullFK()

