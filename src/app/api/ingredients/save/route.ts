export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { regionHeader } from '@/lib/route-config'

export async function POST(request: NextRequest) {
  try {
    console.log('Save API: Starting save operation')
    const { user_recipe_id, ingredients } = await request.json()
    
    console.log('Save API: Received data:', { user_recipe_id, ingredientsCount: ingredients?.length })
    
    if (!user_recipe_id || !ingredients || !Array.isArray(ingredients)) {
      console.log('Save API: Validation failed - missing required fields')
      return NextResponse.json({ error: 'user_recipe_id and ingredients array are required' }, { status: 400 })
    }

    // Get the server-side Supabase client
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Save API: User check result:', { user: !!user, error: authError })
    
    if (authError || !user) {
      console.error('Save API: Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the user owns this recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id')
      .eq('user_recipe_id', user_recipe_id)
      .eq('user_id', user.id)
      .single()

    if (recipeError || !recipe) {
      console.error('Save API: Recipe ownership verification failed:', recipeError)
      return NextResponse.json({ error: 'Recipe not found or access denied' }, { status: 404 })
    }

    console.log('Save API: About to clear existing ingredients for recipe:', user_recipe_id)
    
    // Clear existing detailed ingredients for this recipe
    const { error: deleteError } = await supabase
      .from('user_recipe_ingredients_detail')
      .delete()
      .eq('user_recipe_id', user_recipe_id)

    if (deleteError) {
      console.error('Error deleting existing ingredients:', deleteError)
      return NextResponse.json({ error: 'Failed to clear existing ingredients' }, { status: 500 })
    }

    console.log('Save API: Successfully cleared existing ingredients')

    // Insert new detailed ingredients
    console.log('Save API: Preparing to insert ingredients:', ingredients.length)
    console.log('Save API: First ingredient sample:', ingredients[0])
    
    const ingredientsToInsert = ingredients.map((ingredient: any) => ({
      user_recipe_id,
      ingredient_id: ingredient.ingredient_id,
      original_text: ingredient.original_text,
      matched_term: ingredient.matched_term,
      match_type: ingredient.match_type,
      matched_alias: ingredient.matched_alias || null
    }))

    console.log('Save API: Ingredients to insert:', ingredientsToInsert.slice(0, 2)) // Show first 2 for debugging

    const { data: insertedIngredients, error: insertError } = await supabase
      .from('user_recipe_ingredients_detail')
      .insert(ingredientsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting ingredients:', insertError)
      return NextResponse.json({ error: 'Failed to save ingredients' }, { status: 500 })
    }

    console.log('Save API: Successfully inserted ingredients:', insertedIngredients.length)

    return NextResponse.json({
      success: true,
      saved_count: insertedIngredients.length,
      message: 'Ingredients saved successfully'
    }, { headers: regionHeader() })

  } catch (error) {
    console.error('Save ingredients error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
