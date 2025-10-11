const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Parse ingredient function (from parseIngredient.ts)
const COMMON_UNITS = [
  'cup', 'cups', 'c', 'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tb',
  'teaspoon', 'teaspoons', 'tsp', 'ts', 'fluid ounce', 'fluid ounces', 'fl oz',
  'pint', 'pints', 'pt', 'quart', 'quarts', 'qt', 'gallon', 'gallons', 'gal',
  'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l',
  'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz',
  'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg',
  'clove', 'cloves', 'piece', 'pieces', 'can', 'cans', 'jar', 'jars',
  'package', 'packages', 'bunch', 'bunches', 'head', 'heads', 'sprig', 'sprigs',
  'stalk', 'stalks', 'stick', 'sticks', 'slice', 'slices'
]

function parseIngredient(text) {
  const original = text.trim()
  if (!original) return { amount: '', unit: '', name: '', original }
  
  text = original.replace(/^[•▢\-\s]+/, '').trim()
  
  const amountPattern = /^(\d+(?:[\/\.\-]\d+)?(?:\s+\d+\/\d+)?)\s+/
  const amountMatch = text.match(amountPattern)
  
  let amount = ''
  let remainingText = text
  
  if (amountMatch) {
    amount = amountMatch[1].trim()
    remainingText = text.substring(amountMatch[0].length).trim()
  }
  
  let unit = ''
  let name = remainingText
  
  for (const commonUnit of COMMON_UNITS) {
    const unitPattern = new RegExp(`^(${commonUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?:\\s+|\\b)`, 'i')
    const unitMatch = remainingText.match(unitPattern)
    
    if (unitMatch) {
      unit = unitMatch[1].trim()
      name = remainingText.substring(unitMatch[0].length).trim()
      break
    }
  }
  
  name = name.replace(/^[,\-\s]+/, '').trim()
  
  return { amount: amount || null, unit: unit || null, name: name || original, original }
}

async function restructureGlobalIngredients() {
  const DRY_RUN = false // Set to false to actually make changes
  const TEST_LIMIT = null // Set to null to process ALL recipes
  
  console.log('🔍 Finding global recipe ingredients with multi-line raw_name...\n')
  console.log(`⚠️  DRY RUN MODE: ${DRY_RUN ? 'ON (no changes will be made)' : 'OFF (will modify database)'}\n`)
  if (TEST_LIMIT) {
    console.log(`🧪 TEST MODE: Processing only ${TEST_LIMIT} multi-line recipes\n`)
  } else {
    console.log(`🚀 FULL MODE: Processing ALL multi-line recipes\n`)
  }

  const { data: allIngredients, error: findError } = await supabase
    .from('global_recipe_ingredients')
    .select('id, recipe_id, raw_name, amount, unit, ingredient_id')
    .not('raw_name', 'is', null)
    .limit(1000)

  if (findError) {
    console.error('❌ Error finding ingredients:', findError)
    return
  }

  console.log(`📊 Found ${allIngredients.length} ingredient records\n`)

  const stats = {
    multiLine: 0,
    singleLine: 0,
    totalLinesCreated: 0,
    errors: []
  }

  for (const ing of allIngredients) {
    const lines = ing.raw_name.split('\n').filter(l => l.trim()).map(l => l.trim())
    
    if (lines.length === 1) {
      stats.singleLine++
      continue // Already in good shape
    }

    // Check if we've hit the test limit
    if (TEST_LIMIT && stats.multiLine >= TEST_LIMIT) {
      console.log(`\n⏸️  Reached test limit of ${TEST_LIMIT} recipes, stopping...`)
      break
    }

    stats.multiLine++
    console.log(`\nRecipe ${ing.recipe_id}: ${lines.length} ingredient lines`)
    
    if (DRY_RUN) {
      console.log(`  📝 Would create ${lines.length} separate rows:`)
      lines.slice(0, 3).forEach((line, idx) => {
        const parsed = parseIngredient(line)
        console.log(`     ${idx + 1}. Amount: "${parsed.amount || 'none'}", Unit: "${parsed.unit || 'none'}", Name: "${parsed.name.substring(0, 50)}..."`)
      })
      if (lines.length > 3) {
        console.log(`     ... and ${lines.length - 3} more`)
      }
    } else {
      // ACTUAL EXECUTION
      try {
        // Delete the original multi-line record
        const { error: deleteError } = await supabase
          .from('global_recipe_ingredients')
          .delete()
          .eq('id', ing.id)
        
        if (deleteError) throw deleteError

        // Create separate rows for each ingredient line
        const newIngredients = lines.map(line => {
          const parsed = parseIngredient(line)
          return {
            recipe_id: ing.recipe_id,
            raw_name: parsed.name,
            amount: parsed.amount,
            unit: parsed.unit,
            ingredient_id: null // Will be matched later during analysis
          }
        })

        const { error: insertError } = await supabase
          .from('global_recipe_ingredients')
          .insert(newIngredients)

        if (insertError) throw insertError

        stats.totalLinesCreated += lines.length
        console.log(`  ✅ Created ${lines.length} separate ingredient rows`)

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`)
        stats.errors.push({
          recipe_id: ing.recipe_id,
          error: error.message
        })
      }
    }
  }

  // Final Report
  console.log('\n' + '='.repeat(80))
  console.log('📊 FINAL REPORT')
  console.log('='.repeat(80))
  console.log(`\n📝 Single-line records (already good): ${stats.singleLine}`)
  console.log(`🔨 Multi-line records ${DRY_RUN ? '(would be split)' : '(split)'}:  ${stats.multiLine}`)
  if (!DRY_RUN) {
    console.log(`✅ Total new ingredient rows created: ${stats.totalLinesCreated}`)
    console.log(`❌ Errors: ${stats.errors.length}`)
  }
  
  console.log('\n' + '='.repeat(80))
  if (DRY_RUN) {
    console.log('⚠️  THIS WAS A DRY RUN - No changes were made')
    console.log('\nTo actually execute:')
    console.log('  1. Edit scripts/restructure-global-ingredients.js')
    console.log('  2. Change: const DRY_RUN = false')
    console.log('  3. Run: node scripts/restructure-global-ingredients.js')
  } else {
    console.log('✅ Restructuring complete!')
    console.log('\n📝 NEXT STEPS:')
    console.log('   1. Run detailed ingredient analysis on ALL global recipes')
    console.log('   2. This will match ingredient_id and set FK')
    console.log('   3. Then users who add to cookbook will get proper amounts')
  }
  console.log('')
}

restructureGlobalIngredients()

