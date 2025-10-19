import { NextRequest, NextResponse } from 'next/server'
import { parseRecipeFromText, RecipeFormat } from '@/lib/parseRecipeText'

export async function POST(request: NextRequest) {
  try {
    const { recipe_text, format } = await request.json()
    
    if (!recipe_text || typeof recipe_text !== 'string') {
      return NextResponse.json({ error: 'Recipe text is required' }, { status: 400 })
    }

    if (recipe_text.length > 50000) {
      return NextResponse.json({ error: 'Recipe text is too long (max 50,000 characters)' }, { status: 400 })
    }

    // Parse the recipe text
    const recipe = await parseRecipeFromText(recipe_text, format as RecipeFormat || 'auto-detect')

    if (!recipe) {
      return NextResponse.json({ 
        error: 'No valid recipe found in the text. Please check the format and try again.',
        hint: 'Supported formats: Paprika, Meal-Master, or generic recipe text with ingredients and instructions'
      }, { status: 400 })
    }

    // Generate Paprika-style text for display
    const paprikaText = generatePaprikaText(recipe)

    return NextResponse.json({
      recipe: recipe,
      paprikaText,
      success: true,
      format: format || 'auto-detect',
      confidence: 'high'
    })

  } catch (error) {
    console.error('Public import text error:', error)
    return NextResponse.json(
      { error: 'Failed to parse recipe text' }, 
      { status: 500 }
    )
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

  if (recipe.recipeInstructions && recipe.recipeInstructions.length > 0) {
    text += `## Instructions\n`
    recipe.recipeInstructions.forEach((instruction: string, index: number) => {
      text += `${index + 1}. ${instruction}\n\n`
    })
  }

  if (recipe.source) {
    text += `\n---\n`
    text += `Source: ${recipe.source}\n`
  }

  return text
}
