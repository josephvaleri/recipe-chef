#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test the current matching logic
function testMatchingLogic(individualIngredient, ingredientsData, aliasesData) {
  console.log(`\n🧪 Testing: "${individualIngredient}"`)
  
  // Current logic: Try alias matching FIRST
  console.log('  🔍 Step 1: Alias matching...')
  const aliasMatch = aliasesData.find(alias => {
    const aliasLower = alias.alias.toLowerCase()
    const ingredientLower = individualIngredient.toLowerCase()
    
    const contains = ingredientLower.includes(aliasLower)
    const ingredientWords = ingredientLower.split(/\s+/).filter(word => word.length > 2)
    const aliasContainsIngredientWord = ingredientWords.some(word => aliasLower.includes(word))
    
    const match = contains || aliasContainsIngredientWord
    
    if (match) {
      console.log(`    ✅ Alias match: "${alias.alias}" (contains: ${contains}, word: ${aliasContainsIngredientWord})`)
    }
    
    return match
  })
  
  if (aliasMatch) {
    const matchedIngredient = ingredientsData.find(ing => ing.ingredient_id === aliasMatch.ingredient_id)
    console.log(`  🎯 RESULT: ${matchedIngredient ? matchedIngredient.name : 'NOT FOUND'} (via alias)`)
    return { type: 'alias', ingredient: matchedIngredient, alias: aliasMatch }
  }
  
  // Step 2: Partial matching
  console.log('  🔍 Step 2: Partial matching...')
  const partialMatch = ingredientsData.find(ing => 
    individualIngredient.toLowerCase().includes(ing.name.toLowerCase())
  )
  
  if (partialMatch) {
    console.log(`    ✅ Partial match: "${partialMatch.name}"`)
    console.log(`  🎯 RESULT: ${partialMatch.name} (via partial match)`)
    return { type: 'partial', ingredient: partialMatch }
  }
  
  console.log('  🎯 RESULT: No match found')
  return null
}

async function testMatchingLogic() {
  console.log('🔍 Testing current matching logic...\n')

  try {
    // Load data
    console.log('Loading data...')
    
    const { data: ingredientsData1 } = await supabase
      .from('ingredients')
      .select('ingredient_id, name, category_id')
      .order('name')
      .limit(1000)
    
    const { data: ingredientsData2 } = await supabase
      .from('ingredients')
      .select('ingredient_id, name, category_id')
      .order('name')
      .range(1000, 2000)
    
    const ingredientsData = [...(ingredientsData1 || []), ...(ingredientsData2 || [])]

    const { data: aliasesData } = await supabase
      .from('ingredient_aliases')
      .select('alias_id, alias, ingredient_id')
      .order('alias')

    console.log(`Loaded ${ingredientsData.length} ingredients and ${aliasesData.length} aliases\n`)

    // Test various ingredients
    const testCases = [
      '2 cups crushed tomatoes',
      '1 onion, diced', 
      '3 cloves garlic, minced',
      '1 cup heavy cream',
      '2 tablespoons olive oil',
      '1 teaspoon salt',
      'fresh basil leaves',
      'grated parmesan cheese'
    ]

    console.log('🧪 Testing various ingredients:')
    testCases.forEach(testCase => {
      testMatchingLogic(testCase, ingredientsData, aliasesData)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testMatchingLogic()



