const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get recipe ID from command line
const recipeId = process.argv[2]

if (!recipeId) {
  console.error('Usage: node scripts/analyze-recipe.js <recipe_id>')
  console.error('Example: node scripts/analyze-recipe.js 1305')
  process.exit(1)
}

async function analyzeRecipe(recipeId) {
  try {
    console.log(`\n🔍 Analyzing recipe ${recipeId}...\n`)

    // Check if recipe exists
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, user_id')
      .eq('user_recipe_id', recipeId)
      .single()

    if (recipeError || !recipe) {
      console.error('❌ Recipe not found')
      return
    }

    console.log(`📖 Recipe: ${recipe.title}`)

    // Get raw ingredients
    const { data: rawIngredients, error: rawError } = await supabase
      .from('user_recipe_ingredients')
      .select('id, raw_name, amount, unit')
      .eq('user_recipe_id', recipeId)

    if (rawError || !rawIngredients || rawIngredients.length === 0) {
      console.error('❌ No ingredients found for this recipe')
      return
    }

    console.log(`📝 Found ${rawIngredients.length} ingredients to analyze\n`)

    // Run analysis inline
    const result = await analyzeIngredientsInline(parseInt(recipeId), rawIngredients)

    if (result.error) {
      console.error('❌ Analysis failed:', result.error.message)
      return
    }

    console.log('✅ Analysis complete!')
    console.log(`   Matched: ${result.matched_count}`)
    console.log(`   Unmatched: ${result.unmatched_count}`)

    if (result.unmatched_count > 0 && result.unmatched_ingredients) {
      console.log('\n⚠️  Unmatched ingredients:')
      result.unmatched_ingredients.forEach(ing => {
        console.log(`   - ${ing}`)
      })
    }

    if (result.matched_count > 0 && result.matched_ingredients) {
      console.log('\n✅ Matched ingredients:')
      result.matched_ingredients.slice(0, 10).forEach(m => {
        console.log(`   - "${m.original_text}" → ${m.matched_term} (${m.match_type})`)
      })
      if (result.matched_ingredients.length > 10) {
        console.log(`   ... and ${result.matched_ingredients.length - 10} more`)
      }
    }

    // Verify FK was set
    const { data: detailCheck } = await supabase
      .from('user_recipe_ingredients_detail')
      .select('detail_id, user_recipe_ingredient_id')
      .eq('user_recipe_id', recipeId)

    const withFK = detailCheck?.filter(d => d.user_recipe_ingredient_id !== null).length || 0
    const withoutFK = detailCheck?.filter(d => d.user_recipe_ingredient_id === null).length || 0

    console.log('\n🔗 FK Status:')
    console.log(`   With FK: ${withFK}`)
    console.log(`   Without FK: ${withoutFK}`)

    if (withFK > 0) {
      console.log('\n✅ FK successfully set! Recipe is ready for shopping list.')
    } else {
      console.log('\n⚠️  Warning: No FKs were set. Check the analyze API code.')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Inline analysis logic (same as API)
async function analyzeIngredientsInline(user_recipe_id, rawIngredients) {
  try {
    // Get all available ingredients
    const { data: allIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('ingredient_id, name, category_id')

    if (ingredientsError) {
      return { data: null, error: new Error('Failed to load ingredient database') }
    }

    const matchedIngredients = []
    const unmatchedIngredients = []

    for (const rawIngredient of rawIngredients) {
      const rawName = rawIngredient.raw_name?.toLowerCase().trim()
      if (!rawName) continue

      // Comprehensive cleaning
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
          if (score > bestScore && score > 0.3) {
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
        return { data: null, error: new Error(`Failed to save: ${saveError.message}`) }
      }
    }

    return {
      data: {
        matched_count: matchedIngredients.length,
        unmatched_count: unmatchedIngredients.length,
        matched_ingredients: matchedIngredients,
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

analyzeRecipe(recipeId)

