const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Import the parseIngredient logic (copied from parseIngredient.ts)
const COMMON_UNITS = [
  // Volume
  'cup', 'cups', 'c',
  'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tb',
  'teaspoon', 'teaspoons', 'tsp', 'ts',
  'fluid ounce', 'fluid ounces', 'fl oz', 'fl. oz.',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  'milliliter', 'milliliters', 'millilitre', 'millilitres', 'ml',
  'liter', 'liters', 'litre', 'litres', 'l',
  'deciliter', 'deciliters', 'decilitre', 'decilitres', 'dl',
  
  // Weight
  'pound', 'pounds', 'lb', 'lbs',
  'ounce', 'ounces', 'oz',
  'gram', 'grams', 'gramme', 'grammes', 'g',
  'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kg',
  'milligram', 'milligrams', 'milligramme', 'milligrammes', 'mg',
  
  // Length
  'inch', 'inches', 'in',
  'centimeter', 'centimeters', 'centimetre', 'centimetres', 'cm',
  
  // Other
  'pinch', 'pinches',
  'dash', 'dashes',
  'clove', 'cloves',
  'slice', 'slices',
  'piece', 'pieces',
  'can', 'cans',
  'jar', 'jars',
  'package', 'packages', 'pkg',
  'box', 'boxes',
  'bag', 'bags',
  'bunch', 'bunches',
  'head', 'heads',
  'sprig', 'sprigs',
  'stalk', 'stalks',
  'stick', 'sticks',
  'sheet', 'sheets',
  'leaf', 'leaves',
  'whole', 'wholes',
  'small', 'medium', 'large',
  'to taste'
]

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseIngredient(ingredientText) {
  const original = ingredientText.trim()
  
  if (!original) {
    return { amount: '', unit: '', name: '', original }
  }
  
  let text = original.replace(/^[•▢\-\s]+/, '').trim()
  
  // Try to match a number at the start
  const amountPattern = /^(\d+(?:[\/\.\-]\d+)?(?:\s+\d+\/\d+)?)\s+/
  const amountMatch = text.match(amountPattern)
  
  let amount = ''
  let remainingText = text
  
  if (amountMatch) {
    amount = amountMatch[1].trim()
    remainingText = text.substring(amountMatch[0].length).trim()
  }
  
  // Try to match a unit after the amount
  let unit = ''
  let name = remainingText
  
  for (const commonUnit of COMMON_UNITS) {
    const unitPattern = new RegExp(`^(${escapeRegex(commonUnit)})(?:\\s+|\\b)`, 'i')
    const unitMatch = remainingText.match(unitPattern)
    
    if (unitMatch) {
      unit = unitMatch[1].trim()
      name = remainingText.substring(unitMatch[0].length).trim()
      break
    }
  }
  
  name = name.replace(/^[,\-\s]+/, '').trim()
  
  // Handle parenthetical units
  const parenPattern = /^\(([^)]+)\)\s+/
  const parenMatch = name.match(parenPattern)
  if (parenMatch && !unit) {
    const parenContent = parenMatch[1]
    for (const commonUnit of COMMON_UNITS) {
      if (parenContent.toLowerCase().includes(commonUnit.toLowerCase())) {
        unit = parenContent.trim()
        name = name.substring(parenMatch[0].length).trim()
        break
      }
    }
  }
  
  return {
    amount: amount || '',
    unit: unit || '',
    name: name || original,
    original
  }
}

async function parseGlobalIngredientsAmounts() {
  try {
    console.log('🔍 Finding global recipe ingredients with raw_name...\n')

    // Find all global recipe ingredients that have raw_name
    const { data: ingredientsWithRawName, error: findError } = await supabase
      .from('global_recipe_ingredients')
      .select('id, recipe_id, raw_name, amount, unit')
      .not('raw_name', 'is', null)
      .limit(1000) // Process in chunks

    if (findError) {
      console.error('❌ Error finding ingredients:', findError)
      return
    }

    console.log(`📊 Found ${ingredientsWithRawName.length} ingredient records with raw_name\n`)

    if (ingredientsWithRawName.length === 0) {
      console.log('✅ No ingredients need parsing!')
      return
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0
    }

    // Process each ingredient record
    for (const ingRecord of ingredientsWithRawName) {
      // Split raw_name by newlines to get individual ingredients
      const ingredientLines = ingRecord.raw_name.split('\n').filter(line => line.trim())
      
      console.log(`\nRecipe ${ingRecord.recipe_id}: ${ingredientLines.length} ingredient lines`)
      
      // If there's only one line, we can parse and update this record
      if (ingredientLines.length === 1) {
        const parsed = parseIngredient(ingredientLines[0])
        
        if (parsed.amount || parsed.unit) {
          const { error: updateError } = await supabase
            .from('global_recipe_ingredients')
            .update({
              amount: parsed.amount,
              unit: parsed.unit
            })
            .eq('id', ingRecord.id)
          
          if (updateError) {
            console.log(`  ❌ Failed to update ingredient ${ingRecord.id}: ${updateError.message}`)
            results.failed++
          } else {
            console.log(`  ✅ Updated: "${parsed.original}" → amount: "${parsed.amount}", unit: "${parsed.unit}"`)
            results.success++
          }
        } else {
          console.log(`  ⚠️  No amount/unit found in: "${ingredientLines[0]}"`)
          results.skipped++
        }
      } else {
        // Multiple ingredients in one record - this needs manual intervention
        console.log(`  ⚠️  MULTI-LINE: This record contains ${ingredientLines.length} ingredients:`)
        ingredientLines.slice(0, 3).forEach(line => console.log(`     - ${line}`))
        if (ingredientLines.length > 3) {
          console.log(`     ... and ${ingredientLines.length - 3} more`)
        }
        console.log(`  ⚠️  This needs to be split into separate ingredient rows`)
        results.skipped++
      }
    }

    // Final Report
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL REPORT')
    console.log('='.repeat(80))
    console.log(`\n✅ Successfully parsed and updated: ${results.success}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`⚠️  Skipped (multi-line or no amount): ${results.skipped}`)
    console.log('\n' + '='.repeat(80))
    console.log('📝 NEXT STEPS:')
    console.log('   For multi-line ingredients, you need to:')
    console.log('   1. Split them into separate rows manually')
    console.log('   2. Or create a more complex script to handle splitting')
    console.log('')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

parseGlobalIngredientsAmounts()

