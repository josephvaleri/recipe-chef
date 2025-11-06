export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { fetchHtml } from '@/lib/fetchHtml'
import { parseRecipeFromHtml } from '@/lib/jsonld'
import { createSupabaseServer } from '@/lib/supabase/server'
import { regionHeader } from '@/lib/route-config'

export async function POST(request: NextRequest) {
  try {
    const { url, user_id, auth_token } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Check if user wants to save to their account
    if (user_id && auth_token) {
      // Verify authentication
      const supabase = await createSupabaseServer()
      
      // Set the session using the provided auth token
      const { data: { user }, error: authError } = await supabase.auth.getUser(auth_token)
      
      if (authError || !user || user.id !== user_id) {
        return NextResponse.json({ 
          error: 'Invalid authentication. Please sign in to RecipeChef and try again.',
          hint: 'You need to be signed in to save recipes to your account.'
        }, { status: 401 })
      }

      // Fetch and parse the recipe
      const htmlData = await fetchHtml(url)
      const parseResult = parseRecipeFromHtml(htmlData.html, htmlData.url)

      if (!parseResult.recipe) {
        return NextResponse.json({ 
          error: 'No recipe found on this page',
          confidence: parseResult.confidence,
          source: parseResult.source
        }, { status: 404 })
      }

      // Save recipe to user's account
      const saveResult = await saveRecipeToUserAccount(parseResult.recipe, user.id, supabase)
      
      if (!saveResult.success) {
        return NextResponse.json({ 
          error: 'Failed to save recipe to your account',
          details: saveResult.error
        }, { status: 500 })
      }

      // Generate Paprika-style text for display
      const paprikaText = generatePaprikaText(parseResult.recipe)

      return NextResponse.json({
        recipe: parseResult.recipe,
        paprikaText,
        confidence: parseResult.confidence,
        source: parseResult.source,
        title: htmlData.title,
        saved: true,
        recipeId: saveResult.recipeId,
        message: 'Recipe successfully imported and saved to your RecipeChef account!'
      }, { headers: regionHeader() })
    } else {
      // No authentication provided - just parse and return the recipe
      const htmlData = await fetchHtml(url)
      const parseResult = parseRecipeFromHtml(htmlData.html, htmlData.url)

      if (!parseResult.recipe) {
        return NextResponse.json({ 
          error: 'No recipe found on this page',
          confidence: parseResult.confidence,
          source: parseResult.source
        }, { status: 404 })
      }

      // Generate Paprika-style text for display
      const paprikaText = generatePaprikaText(parseResult.recipe)

      return NextResponse.json({
        recipe: parseResult.recipe,
        paprikaText,
        confidence: parseResult.confidence,
        source: parseResult.source,
        title: htmlData.title,
        saved: false,
        message: 'Recipe parsed successfully! To save it to your RecipeChef account, please sign in and provide your authentication details.'
      }, { headers: regionHeader() })
    }

  } catch (error) {
    console.error('Public import recipe with auth error:', error)
    return NextResponse.json(
      { error: 'Failed to import recipe' }, 
      { status: 500 }
    )
  }
}

async function saveRecipeToUserAccount(recipe: any, userId: string, supabase: any) {
  try {
    // Check for duplicate recipe
    const { data: existingRecipe } = await supabase
      .from('user_recipes')
      .select('user_recipe_id')
      .eq('user_id', userId)
      .eq('title', recipe.name)
      .limit(1)

    if (existingRecipe && existingRecipe.length > 0) {
      return { success: false, error: 'Recipe with this name already exists in your account' }
    }

    // Insert recipe
    const { data: savedRecipe, error: recipeError } = await supabase
      .from('user_recipes')
      .insert({
        user_id: userId,
        title: recipe.name,
        description: recipe.description,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.recipeYield,
        source_name: recipe.source,
        source_url: recipe.sourceUrl
      })
      .select()
      .single()

    if (recipeError || !savedRecipe) {
      return { success: false, error: recipeError?.message || 'Failed to save recipe' }
    }

    // Save ingredients
    if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
      const ingredientsData = recipe.recipeIngredient.map((ingredient: string) => ({
        user_recipe_id: savedRecipe.user_recipe_id,
        raw_name: ingredient,
        amount: '',
        unit: ''
      }))

      const { error: ingredientsError } = await supabase
        .from('user_recipe_ingredients')
        .insert(ingredientsData)

      if (ingredientsError) {
        console.error('Failed to save ingredients:', ingredientsError)
      }
    }

    // Save instructions
    if (recipe.recipeInstructions && recipe.recipeInstructions.length > 0) {
      const instructionsData = recipe.recipeInstructions.map((instruction: any, index: number) => ({
        user_recipe_id: savedRecipe.user_recipe_id,
        text: typeof instruction === 'string' ? instruction : instruction.text,
        step_number: index + 1
      }))

      const { error: instructionsError } = await supabase
        .from('user_recipe_steps')
        .insert(instructionsData)

      if (instructionsError) {
        console.error('Failed to save instructions:', instructionsError)
      }
    }

    return { success: true, recipeId: savedRecipe.user_recipe_id }
  } catch (error) {
    console.error('Error saving recipe to user account:', error)
    return { success: false, error: 'Database error' }
  }
}

function generatePaprikaText(recipe: any): string {
  let text = `# ${recipe.name}\n\n`
  
  if (recipe.description) {
    text += `${recipe.description}\n\n`
  }

  if (recipe.prepTime || recipe.cookTime || recipe.totalTime) {
    text += `## Timing\n`
    if (recipe.prepTime) text += `Prep: ${recipe.prepTime}\n`
    if (recipe.cookTime) text += `Cook: ${recipe.cookTime}\n`
    if (recipe.totalTime) text += `Total: ${recipe.totalTime}\n`
    text += `\n`
  }

  if (recipe.recipeYield) {
    text += `Servings: ${recipe.recipeYield}\n\n`
  }

  if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
    text += `## Ingredients\n`
    recipe.recipeIngredient.forEach((ingredient: string) => {
      text += `- ${ingredient}\n`
    })
    text += `\n`
  }

  if (recipe.recipeInstructions) {
    text += `## Instructions\n`
    if (Array.isArray(recipe.recipeInstructions)) {
      recipe.recipeInstructions.forEach((instruction: any, index: number) => {
        const text_content = typeof instruction === 'string' ? instruction : instruction.text
        text += `${index + 1}. ${text_content}\n\n`
      })
    } else {
      text += `${recipe.recipeInstructions}\n`
    }
  }

  if (recipe.source || recipe.sourceUrl) {
    text += `\n---\n`
    text += `Source: ${recipe.source || recipe.sourceUrl}\n`
  }

  return text
}
