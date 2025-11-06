export const runtime = 'nodejs'
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
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Get the server-side Supabase client and check authentication
    let supabase
    let user
    
    try {
      supabase = await createSupabaseServer()
      
      // Try to get session from cookie manually first
      const authCookie = request.cookies.get('sb-avlqlppqteqjfsnlitiz-auth-token')
      console.log('Auth cookie exists:', !!authCookie)
      
      let sessionData: any = null
      if (authCookie?.value) {
        // Parse the base64- prefixed cookie
        try {
          const cookieValue = authCookie.value
          if (cookieValue.startsWith('base64-')) {
            const base64Data = cookieValue.substring(7) // Remove 'base64-' prefix
            const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8')
            sessionData = JSON.parse(jsonString)
            console.log('Parsed session data:', {
              hasAccessToken: !!sessionData.access_token,
              hasRefreshToken: !!sessionData.refresh_token,
              hasUser: !!sessionData.user,
              userId: sessionData.user?.id
            })
            
            // Manually set the session
            if (sessionData.access_token && sessionData.refresh_token) {
              const { data, error: setSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token
              })
              
              if (setSessionError) {
                console.error('Error setting session:', setSessionError)
              } else {
                console.log('Session set successfully:', data.user?.id)
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing auth cookie:', parseError)
        }
      }
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error in import-recipe:', authError)
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        })
      }
      
      if (!authUser) {
        console.error('No user found in session')
        // If we have valid session data but getUser() failed, use the user from cookie
        if (sessionData?.user?.id) {
          console.log('Using user from cookie as fallback:', sessionData.user.id)
          user = sessionData.user
        } else {
          return NextResponse.json({ 
            error: 'Authentication required. Please refresh the page and try again.',
            details: authError?.message || 'Session not found. You may need to sign out and sign back in.',
            hint: 'Try: 1) Refresh page, 2) Sign out & back in, 3) Clear browser cache'
          }, { status: 401 })
        }
      } else {
        user = authUser
        console.log('User authenticated successfully:', user.id)
      }
      
    } catch (clientError) {
      console.error('Error creating supabase client or getting user:', clientError)
      return NextResponse.json({ 
        error: 'Server authentication error',
        details: clientError instanceof Error ? clientError.message : 'Unknown error'
      }, { status: 500 })
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
      const supabase = await createSupabaseServer()
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
