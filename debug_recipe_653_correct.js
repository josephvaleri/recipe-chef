// Debug recipe 653 in the correct table (global_recipes)

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

async function debugRecipe653Correct() {
  console.log('=== Debugging Recipe 653 in Global Recipes ===\n')

  try {
    // Check if recipe 653 exists in global_recipes
    console.log('1. Checking if recipe 653 exists in global_recipes:')
    const { data: globalRecipe, error: globalRecipeError } = await supabase
      .from('global_recipes')
      .select('recipe_id, title, servings')
      .eq('recipe_id', 653)

    if (globalRecipeError) {
      console.error('Error fetching global recipe 653:', globalRecipeError)
    } else {
      console.log('Global recipe 653:', globalRecipe)
    }

    // Check if there are any ingredients for recipe 653 in global_recipe_ingredients
    console.log('\n2. Checking ingredients for global recipe 653:')
    const { data: globalIngredients, error: globalIngredientsError } = await supabase
      .from('global_recipe_ingredients')
      .select(`
        recipe_id,
        amount,
        unit,
        ingredient_id,
        ingredients(name)
      `)
      .eq('recipe_id', 653)

    if (globalIngredientsError) {
      console.error('Error fetching global ingredients:', globalIngredientsError)
    } else {
      console.log('Global ingredients for recipe 653:', globalIngredients)
    }

    // Check if there are any detailed ingredients for recipe 653 in global_recipe_ingredients_detail
    console.log('\n3. Checking detailed ingredients for global recipe 653:')
    const { data: globalDetailedIngredients, error: globalDetailedError } = await supabase
      .from('global_recipe_ingredients_detail')
      .select(`
        recipe_id,
        original_text,
        matched_term,
        match_type,
        ingredients(name)
      `)
      .eq('recipe_id', 653)

    if (globalDetailedError) {
      console.error('Error fetching global detailed ingredients:', globalDetailedError)
    } else {
      console.log('Global detailed ingredients for recipe 653:', globalDetailedIngredients)
    }

    // Check if there are any tamarind-related ingredients in global_recipe_ingredients_detail
    console.log('\n4. Checking all tamarind-related global detailed ingredients:')
    const { data: allTamarindGlobal, error: allTamarindGlobalError } = await supabase
      .from('global_recipe_ingredients_detail')
      .select(`
        recipe_id,
        original_text,
        matched_term,
        match_type,
        ingredients(name)
      `)
      .or('original_text.ilike.%tamarind%,matched_term.ilike.%tamarind%')
      .order('recipe_id')

    if (allTamarindGlobalError) {
      console.error('Error fetching all tamarind global ingredients:', allTamarindGlobalError)
    } else {
      console.log('All tamarind-related global detailed ingredients:', allTamarindGlobal)
    }

    // Also check user_recipes to be thorough
    console.log('\n5. Double-checking user_recipes for recipe 653:')
    const { data: userRecipe, error: userRecipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, servings')
      .eq('user_recipe_id', 653)

    if (userRecipeError) {
      console.error('Error fetching user recipe 653:', userRecipeError)
    } else {
      console.log('User recipe 653:', userRecipe)
    }

  } catch (error) {
    console.error('Error in debug script:', error)
  }
}

debugRecipe653Correct()
