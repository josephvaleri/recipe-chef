// Debug why "Tamarind" is showing up in recipe 653 analysis
// when recipe 653 has no ingredients at all

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAnalysisContamination() {
  console.log('=== Debugging Analysis Contamination ===\n')

  try {
    // Check if recipe 653 exists at all
    console.log('1. Checking if recipe 653 exists:')
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, servings')
      .eq('user_recipe_id', 653)

    if (recipeError) {
      console.error('Error fetching recipe 653:', recipeError)
    } else {
      console.log('Recipe 653:', recipe)
    }

    // Check if there are any ingredients for recipe 653 in any table
    console.log('\n2. Checking all ingredient tables for recipe 653:')
    
    // Check user_recipe_ingredients
    const { data: uri, error: uriError } = await supabase
      .from('user_recipe_ingredients')
      .select('*')
      .eq('user_recipe_id', 653)
    
    console.log('user_recipe_ingredients:', uri)

    // Check user_recipe_ingredients_detail
    const { data: urid, error: uridError } = await supabase
      .from('user_recipe_ingredients_detail')
      .select('*')
      .eq('user_recipe_id', 653)
    
    console.log('user_recipe_ingredients_detail:', urid)

    // Check if there are any recent detailed ingredients that might be contaminating
    console.log('\n3. Recent detailed ingredients (last 10):')
    const { data: recentIngredients, error: recentError } = await supabase
      .from('user_recipe_ingredients_detail')
      .select(`
        user_recipe_id,
        original_text,
        matched_term,
        match_type,
        ingredients(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Error fetching recent ingredients:', recentError)
    } else {
      console.log('Recent ingredients:', recentIngredients)
    }

    // Check if there are any tamarind-related detailed ingredients
    console.log('\n4. All tamarind-related detailed ingredients:')
    const { data: tamarindDetailed, error: tamarindDetailedError } = await supabase
      .from('user_recipe_ingredients_detail')
      .select(`
        user_recipe_id,
        original_text,
        matched_term,
        match_type,
        ingredients(name)
      `)
      .or('original_text.ilike.%tamarind%,matched_term.ilike.%tamarind%')
      .order('user_recipe_id')

    if (tamarindDetailedError) {
      console.error('Error fetching tamarind detailed ingredients:', tamarindDetailedError)
    } else {
      console.log('Tamarind detailed ingredients:', tamarindDetailed)
    }

  } catch (error) {
    console.error('Error in debug script:', error)
  }
}

debugAnalysisContamination()
