import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { generateRecipePDF } from '@/lib/pdf'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id, scope } = await request.json()

    if (!id || !scope) {
      return NextResponse.json({ error: 'Recipe ID and scope are required' }, { status: 400 })
    }

    // Load recipe data
    let recipeData
    let ingredientsData
    let stepsData

    if (scope === 'user') {
      // User recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('user_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .eq('user_recipe_id', id)
        .eq('user_id', user.id)
        .single()

      if (recipeError) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }

      const { data: ingredients } = await supabase
        .from('user_recipe_ingredients')
        .select('amount, unit, raw_name')
        .eq('user_recipe_id', id)

      const { data: steps } = await supabase
        .from('user_recipe_steps')
        .select('step_number, text')
        .eq('user_recipe_id', id)
        .order('step_number')

      recipeData = recipe
      ingredientsData = ingredients || []
      stepsData = steps || []
    } else {
      // Global recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('global_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .eq('recipe_id', id)
        .eq('is_published', true)
        .single()

      if (recipeError) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }

      const { data: ingredients } = await supabase
        .from('global_recipe_ingredients')
        .select(`
          amount,
          unit,
          ingredient:ingredients(name)
        `)
        .eq('recipe_id', id)

      const { data: steps } = await supabase
        .from('global_recipe_steps')
        .select('step_number, text')
        .eq('recipe_id', id)
        .order('step_number')

      recipeData = recipe
      ingredientsData = ingredients || []
      stepsData = steps || []
    }

    // Transform data for PDF generation
    const recipeForPDF = {
      title: recipeData.title,
      description: recipeData.description,
      image: recipeData.image_url,
      prepTime: recipeData.prep_time,
      cookTime: recipeData.cook_time,
      totalTime: recipeData.total_time,
      servings: recipeData.servings,
      difficulty: recipeData.difficulty,
      cuisine: recipeData.cuisine?.name,
      ingredients: ingredientsData.map((ingredient: any) => ({
        amount: ingredient.amount,
        unit: ingredient.unit,
        name: ('raw_name' in ingredient ? ingredient.raw_name : ingredient.ingredient?.name) || ''
      })),
      instructions: stepsData.map(step => ({
        step: step.step_number,
        text: step.text
      })),
      source: recipeData.source_name,
      sourceUrl: recipeData.source_url
    }

    // Generate PDF
    const pdfDoc = generateRecipePDF(recipeForPDF)
    const pdfBuffer = await pdfDoc.toBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${recipeData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
      },
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
