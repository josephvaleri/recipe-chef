import { NextRequest, NextResponse } from 'next/server'
import { fetchHtml } from '@/lib/fetchHtml'
import { parseRecipeFromHtml } from '@/lib/jsonld'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Get the server-side Supabase client and check authentication
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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

    // Log the import attempt
    await supabase
      .from('import_logs')
      .insert({
        user_id: user.id,
        source_url: url,
        status: parseResult.confidence === 'high' ? 'success' : 'fallback',
        message: `Parsed with ${parseResult.confidence} confidence using ${parseResult.source}`
      })

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
    console.error('Import recipe error:', error)
    
    // Try to log the error if we can get the user
    try {
      const supabase = createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('import_logs')
          .insert({
            user_id: user.id,
            source_url: 'unknown',
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
      }
    } catch (logError) {
      console.error('Failed to log import error:', logError)
    }

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
