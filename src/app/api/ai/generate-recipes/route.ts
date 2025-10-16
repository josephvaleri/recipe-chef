import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase-server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Get the server-side Supabase client and check authentication
    const supabase = await createServerClient()
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

    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log('Generating recipes for query:', query)

    // Check cache first for ingredient-based searches
    const { data: cachedData, error: cacheError } = await supabase
      .rpc('get_cached_recipes', {
        search_query: query,
        search_type: 'ingredient_search'
      })

    if (!cacheError && cachedData && cachedData.length > 0) {
      console.log('Found cached recipes for ingredient search, returning cached results')
      const cachedRecipes = cachedData[0].recipes
      
      // Log cache hit for analytics
      await supabase
        .from('ai_feedback')
        .insert({
          user_id: user.id,
          query: query,
          result_source: 'cache_hit'
        })

      return NextResponse.json({ 
        recipes: cachedRecipes,
        query: query,
        from_cache: true
      })
    }

    console.log('No cache found, generating recipes with OpenAI...')

    const recipeGenerationPrompt = `Generate 3 recipes based on this request: "${query}"

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
            search_query: query,
            recipes_data: generatedRecipes,
            search_type: 'ingredient_search'
          })
        
        if (cacheError) {
          console.error('Error caching recipes:', cacheError)
        } else {
          console.log('Successfully cached ingredient search recipes with ID:', cacheId)
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
        query: query,
        result_source: 'openai_recipe_generation'
      })

    return NextResponse.json({ 
      recipes: generatedRecipes,
      query: query,
      from_cache: false
    })

  } catch (error) {
    console.error('Recipe generation error:', error)
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 })
  }
}
