const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BATCH_SIZE = 10
const DELAY_BETWEEN_BATCHES = 1000

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Comprehensive cleaning function
function cleanIngredientName(rawName) {
  return rawName
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
}

async function matchIngredient(rawName, allIngredients) {
  const cleaned = cleanIngredientName(rawName.toLowerCase())
  
  let bestMatch = null
  let bestScore = 0

  for (const ingredient of allIngredients) {
    const ingredientName = ingredient.name.toLowerCase()
    
    // Exact match
    if (ingredientName === cleaned || ingredientName === rawName.toLowerCase()) {
      return { ingredient, score: 1.0 }
    }
    
    // Plural/singular
    const isPlural = cleaned.endsWith('s') && ingredientName === cleaned.slice(0, -1)
    const isSingular = ingredientName.endsWith('s') && cleaned === ingredientName.slice(0, -1)
    if (isPlural || isSingular) {
      return { ingredient, score: 0.9 }
    }
    
    // Contains match
    if (cleaned.includes(ingredientName)) {
      const score = ingredientName.length / cleaned.length
      if (score > bestScore && score > 0.3) {
        bestMatch = ingredient
        bestScore = score
      }
    }
    
    if (ingredientName.includes(cleaned)) {
      const score = cleaned.length / ingredientName.length
      if (score > bestScore && score > 0.3) {
        bestMatch = ingredient
        bestScore = score
      }
    }
  }

  if (bestMatch && bestScore > 0.3) {
    return { ingredient: bestMatch, score: bestScore }
  }
  
  return null
}

async function analyzeAllGlobalRecipes() {
  try {
    console.log('🔍 Analyzing ALL global recipes...\n')

    // Get all ingredients for matching
    const { data: allIngredients } = await supabase
      .from('ingredients')
      .select('ingredient_id, name, category_id')

    console.log(`📚 Loaded ${allIngredients.length} ingredients for matching\n`)

    // Get all global recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('global_recipes')
      .select('recipe_id, title')
      .order('recipe_id')

    if (recipesError) {
      console.error('❌ Error loading recipes:', recipesError)
      return
    }

    console.log(`📊 Found ${recipes.length} global recipes to analyze\n`)

    const stats = {
      success: 0,
      failed: 0,
      skipped: 0,
      totalMatched: 0,
      totalUnmatched: 0
    }

    // Process in batches
    for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
      const batch = recipes.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(recipes.length / BATCH_SIZE)
      
      console.log(`\n🔄 Batch ${batchNum}/${totalBatches} (recipes ${i + 1}-${Math.min(i + BATCH_SIZE, recipes.length)})...\n`)

      for (const recipe of batch) {
        try {
          // Get ingredients for this recipe
          const { data: ingredients, error: ingError } = await supabase
            .from('global_recipe_ingredients')
            .select('id, raw_name, amount, unit, ingredient_id')
            .eq('recipe_id', recipe.recipe_id)

          if (ingError || !ingredients || ingredients.length === 0) {
            console.log(`  [${recipe.recipe_id}] ${recipe.title} - SKIPPED (no ingredients)`)
            stats.skipped++
            continue
          }

          // Match each ingredient
          const detailRecords = []
          let matched = 0
          let unmatched = 0

          for (const ing of ingredients) {
            if (!ing.raw_name) continue

            const matchResult = await matchIngredient(ing.raw_name, allIngredients)

            if (matchResult) {
              detailRecords.push({
                recipe_id: recipe.recipe_id,
                global_recipe_ingredient_id: ing.id, // SET FK!
                ingredient_id: matchResult.ingredient.ingredient_id,
                original_text: ing.raw_name,
                matched_term: matchResult.ingredient.name,
                match_type: matchResult.score >= 0.95 ? 'exact' : 'alias'
              })
              matched++
            } else {
              unmatched++
            }
          }

          // Delete existing detail records for this recipe
          await supabase
            .from('global_recipe_ingredients_detail')
            .delete()
            .eq('recipe_id', recipe.recipe_id)

          // Insert new detail records
          if (detailRecords.length > 0) {
            const { error: insertError } = await supabase
              .from('global_recipe_ingredients_detail')
              .insert(detailRecords)

            if (insertError) {
              console.log(`  [${recipe.recipe_id}] ${recipe.title} - FAILED: ${insertError.message}`)
              stats.failed++
              continue
            }
          }

          console.log(`  [${recipe.recipe_id}] ${recipe.title} - ✅ Matched: ${matched}/${ingredients.length}`)
          stats.success++
          stats.totalMatched += matched
          stats.totalUnmatched += unmatched

        } catch (error) {
          console.log(`  [${recipe.recipe_id}] ${recipe.title} - ERROR: ${error.message}`)
          stats.failed++
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < recipes.length) {
        await delay(DELAY_BETWEEN_BATCHES)
      }
    }

    // Final Report
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL REPORT - GLOBAL RECIPE ANALYSIS')
    console.log('='.repeat(80))
    console.log(`\n✅ Successfully analyzed: ${stats.success}`)
    console.log(`❌ Failed: ${stats.failed}`)
    console.log(`⚠️  Skipped: ${stats.skipped}`)
    console.log(`\n🎯 Total ingredients matched: ${stats.totalMatched}`)
    console.log(`⚠️  Total unmatched: ${stats.totalUnmatched}`)
    console.log('\n' + '='.repeat(80))
    console.log('✅ All global recipes analyzed!')
    console.log('   Users can now add these to their cookbook with FK preserved.')
    console.log('')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

analyzeAllGlobalRecipes()
