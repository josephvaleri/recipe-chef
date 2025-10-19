import { NextRequest, NextResponse } from 'next/server'
import { fetchHtml } from '@/lib/fetchHtml'
import { parseRecipeFromHtml } from '@/lib/jsonld'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
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

    // Generate Paprika-style text for display
    const paprikaText = generatePaprikaText(parseResult.recipe)

    return NextResponse.json({
      recipe: parseResult.recipe,
      paprikaText,
      confidence: parseResult.confidence,
      source: parseResult.source,
      title: htmlData.title
    })

  } catch (error) {
    console.error('Public import recipe error:', error)
    return NextResponse.json(
      { error: 'Failed to import recipe' }, 
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
