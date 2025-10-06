import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }

    // Get the server-side Supabase client
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Load API: User check result:', { user: !!user, error: authError })
    
    if (authError || !user) {
      console.error('Load API: Authentication error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the user owns this recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id')
      .eq('user_recipe_id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (recipeError || !recipe) {
      console.error('Load API: Recipe ownership verification failed:', recipeError)
      return NextResponse.json({ error: 'Recipe not found or access denied' }, { status: 404 })
    }

    // Load saved detailed ingredients
    const { data: savedIngredients, error: loadError } = await supabase
      .from('user_recipe_ingredients_detail')
      .select(`
        detail_id,
        original_text,
        matched_term,
        match_type,
        matched_alias,
        ingredient:ingredients(
          ingredient_id,
          name,
          category_id,
          category:ingredient_categories(name)
        )
      `)
      .eq('user_recipe_id', recipeId)

    if (loadError) {
      console.error('Error loading saved ingredients:', loadError)
      return NextResponse.json({ error: 'Failed to load saved ingredients' }, { status: 500 })
    }

    if (!savedIngredients || savedIngredients.length === 0) {
      return NextResponse.json({ ingredients: {}, unmatched: [] })
    }

    // Group ingredients by category
    const groupedIngredients = savedIngredients.reduce((acc, item) => {
      const categoryName = item.ingredient.category.name
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push({
        ingredient_id: item.ingredient.ingredient_id,
        name: item.ingredient.name,
        category_id: item.ingredient.category_id,
        category: item.ingredient.category,
        original_text: item.original_text,
        match_type: item.match_type,
        matched_term: item.matched_term,
        matched_alias: item.matched_alias
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      ingredients: groupedIngredients,
      unmatched: []
    })

  } catch (error) {
    console.error('Load ingredients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
