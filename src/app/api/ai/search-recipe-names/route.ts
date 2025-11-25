export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseServer } from '@/lib/supabase/server'
import { regionHeader } from '@/lib/route-config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Get the server-side Supabase client and check authentication
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user profile to check subscription status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has AI access (active subscription or trial)
    if (profile.status === 'inactive' || (profile.status === 'trial' && profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date())) {
      return NextResponse.json({ error: 'Subscription required for AI features' }, { status: 403 })
    }

    const { recipeName } = await request.json()

    if (!recipeName || typeof recipeName !== 'string') {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 })
    }

    console.log('Searching for recipe name:', recipeName)

    // Clean the recipe name for search
    const cleanRecipeName = recipeName
      .toLowerCase()
      .replace(/give me recipes? for/gi, '')
      .replace(/recipes? for/gi, '')
      .replace(/how to make/gi, '')
      .replace(/how to cook/gi, '')
      .trim()

    // Step 1: Search user recipes with fuzzy matching (75% similarity threshold)
    const { data: userRecipes, error: userError } = await supabase
      .rpc('search_user_recipes_by_similarity', {
        search_term: cleanRecipeName,
        similarity_threshold: 0.75
      })

    if (userError) {
      console.error('Error searching user recipes:', userError)
    }

    // Step 2: Search global recipes with fuzzy matching (75% similarity threshold)
    const { data: globalRecipes, error: globalError } = await supabase
      .rpc('search_global_recipes_by_similarity', {
        search_term: cleanRecipeName,
        similarity_threshold: 0.75
      })

    if (globalError) {
      console.error('Error searching global recipes:', globalError)
    }

    const userRecipesData = (userRecipes || []).map((recipe: any) => ({ ...recipe, source: 'user' }))
    const globalRecipesData = (globalRecipes || []).map((recipe: any) => ({ ...recipe, source: 'global' }))

    console.log('Found user recipes by similarity:', userRecipesData.length)
    console.log('Found global recipes by similarity:', globalRecipesData.length)

    // Step 3: If we found 75%+ matches, return them
    if (userRecipesData.length > 0 || globalRecipesData.length > 0) {
      return NextResponse.json({
        type: 'database_results',
        userRecipes: userRecipesData,
        globalRecipes: globalRecipesData,
        totalResults: userRecipesData.length + globalRecipesData.length
      }, { headers: regionHeader() })
    }

    // Step 4: Check cache first, then use OpenAI if no cache found
    console.log('No 75%+ matches found, checking cache for generated recipes...')
    
    // Check cache for existing generated recipes
    const { data: cachedData, error: cacheError } = await supabase
      .rpc('get_cached_recipes', {
        search_query: cleanRecipeName,
        search_type: 'recipe_name_search'
      })

    if (!cacheError && cachedData && cachedData.length > 0) {
      console.log('Found cached recipes, returning cached results')
      const cachedRecipes = cachedData[0].recipes
      
      // Log cache hit for analytics
      await supabase
        .from('ai_feedback')
        .insert({
          user_id: user.id,
          query: recipeName,
          result_source: 'cache_hit'
        })

      return NextResponse.json({
        type: 'ai_generated',
        recipes: cachedRecipes,
        query: recipeName,
        from_cache: true
      }, { headers: regionHeader() })
    }

    console.log('No cache found, generating recipes with OpenAI...')
    
    const recipeGenerationPrompt = `Generate 3 recipes for "${recipeName}" in JSON format.

Return a JSON array with this exact structure:

[{
  "name": "Recipe Title",
  "description": "Brief description",
  "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400",
  "prepTime": "PT15M",
  "cookTime": "PT30M",
  "totalTime": "PT45M",
  "recipeYield": "4",
  "recipeCategory": "Main Course",
  "recipeCuisine": "International",
  "recipeIngredient": ["2 cups chicken", "1 cup rice"],
  "recipeInstructions": [
    {"text": "Heat oil in pan"},
    {"text": "Add chicken and cook"}
  ],
  "nutrition": {"calories": "350"}
}]

Rules:
- Use PT format for times (PT15M = 15 minutes)
- recipeIngredient: array of strings
- recipeInstructions: array of objects with "text" property
- Include estimated calories in the nutrition field for each recipe
- Return ONLY the JSON array, no other text`

    const recipeGeneration = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: recipeGenerationPrompt }],
      max_tokens: 1500,
      temperature: 0.7,
    })

    let generatedRecipes = []
    try {
      const responseText = recipeGeneration.choices[0]?.message?.content || '[]'
      console.log('OpenAI response:', responseText.substring(0, 200) + '...')
      
      // Clean the response text to ensure it's valid JSON
      let cleanResponse = responseText.trim()
      
      // Remove any markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Parse the JSON
      generatedRecipes = JSON.parse(cleanResponse)
      
      // Validate that it's an array
      if (!Array.isArray(generatedRecipes)) {
        console.error('Generated recipes is not an array:', generatedRecipes)
        generatedRecipes = []
      } else {
        console.log('Successfully parsed', generatedRecipes.length, 'recipes')
        
        // Validate each recipe has required fields
        generatedRecipes = generatedRecipes.filter(recipe => {
          if (!recipe.name || !recipe.recipeIngredient || !recipe.recipeInstructions) {
            console.warn('Skipping invalid recipe:', recipe)
            return false
          }
          return true
        })
      }
    } catch (parseError) {
      console.error('Error parsing generated recipes:', parseError)
      console.error('Raw response:', recipeGeneration.choices[0]?.message?.content)
      generatedRecipes = []
    }

    // Cache the generated recipes for future use
    if (generatedRecipes.length > 0) {
      try {
        const { data: cacheId, error: cacheError } = await supabase
          .rpc('cache_recipes', {
            search_query: cleanRecipeName,
            recipes_data: generatedRecipes,
            search_type: 'recipe_name_search'
          })
        
        if (cacheError) {
          console.error('Error caching recipes:', cacheError)
        } else {
          console.log('Successfully cached recipes with ID:', cacheId)
        }
      } catch (cacheError) {
        console.error('Error caching recipes:', cacheError)
      }
    }

    // Log the interaction for analytics
    await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        query: recipeName,
        result_source: 'openai_recipe_name_search'
      })

    return NextResponse.json({
      type: 'ai_generated',
      recipes: generatedRecipes,
      query: recipeName,
      from_cache: false
    }, { headers: regionHeader() })

  } catch (error) {
    console.error('Recipe name search error:', error)
    return NextResponse.json({ error: 'Failed to search recipe names' }, { status: 500 })
  }
}