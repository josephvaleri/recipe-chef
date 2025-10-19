import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase-server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Function to generate relevant Unsplash image URLs based on recipe content
function enhanceImageUrl(recipeName: string, category?: string, cuisine?: string): string {
  // Extract keywords from recipe name and category
  const keywords = [recipeName.toLowerCase()]
  if (category) keywords.push(category.toLowerCase())
  if (cuisine) keywords.push(cuisine.toLowerCase())
  
  // Map common food terms to specific Unsplash photo IDs for better results
  const photoMap: { [key: string]: string } = {
    'pasta': '1556909114-f6e7ad7d3136',
    'pizza': '1565299624946-b14b60b3f11a',
    'salad': '1540420773420-3366772f4999',
    'chicken': '1607623814175-e6e3fa39e3fa',
    'beef': '1546833999-b9f581a1996d',
    'fish': '1544551763-46a013bb70d5',
    'soup': '1547592180-85f173990577',
    'dessert': '1551024506-0bcc0dbc5449',
    'cake': '1578985545062-69928b1c9587',
    'bread': '1586444247102-2d3ac81b93ae',
    'sandwich': '1528735602780-2552fd46c7af',
    'burger': '1568901346375-23c7210e3ada',
    'taco': '1565299584703-5e7e8c4d1b16',
    'burrito': '1626700051175-6818013eac1c',
    'stir': '1546833999-b9f581a1996d',
    'fry': '1568901346375-23c7210e3ada',
    'grill': '1607623814175-e6e3fa39e3fa',
    'bake': '1578985545062-69928b1c9587',
    'roast': '1607623814175-e6e3fa39e3fa',
    'steam': '1544551763-46a013bb70d5',
    'italian': '1556909114-f6e7ad7d3136',
    'mexican': '1565299584703-5e7e8c4d1b16',
    'asian': '1546833999-b9f581a1996d',
    'indian': '1547592180-85f173990577',
    'chinese': '1546833999-b9f581a1996d',
    'japanese': '1544551763-46a013bb70d5',
    'thai': '1546833999-b9f581a1996d',
    'french': '1578985545062-69928b1c9587',
    'mediterranean': '1540420773420-3366772f4999',
    'american': '1568901346375-23c7210e3ada',
    'breakfast': '1551024506-0bcc0dbc5449',
    'lunch': '1528735602780-2552fd46c7af',
    'dinner': '1544551763-46a013bb70d5',
    'appetizer': '1540420773420-3366772f4999',
    'main': '1544551763-46a013bb70d5',
    'side': '1540420773420-3366772f4999',
    'vegetarian': '1540420773420-3366772f4999',
    'vegan': '1540420773420-3366772f4999'
  }
  
  // Find the best matching photo ID
  let photoId = '1556909114-f6e7ad7d3136' // Default to pasta photo
  
  for (const keyword of keywords) {
    for (const [term, id] of Object.entries(photoMap)) {
      if (keyword.includes(term)) {
        photoId = id
        break
      }
    }
    if (photoId !== '1556909114-f6e7ad7d3136') break // Found a match, stop searching
  }
  
  return `https://images.unsplash.com/photo-${photoId}?w=400&auto=format&fit=crop&q=80`
}

// Function to generate custom DALL-E images for recipes (optional)
async function generateDalleImage(recipeName: string, description?: string): Promise<string | null> {
  try {
    const prompt = `A beautiful, appetizing photograph of ${recipeName}${description ? `: ${description}` : ''}. Professional food photography style, well-lit, appetizing presentation, high quality, realistic`
    
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    })

    return image.data?.[0]?.url || null
  } catch (error) {
    console.error('DALL-E image generation error:', error)
    return null
  }
}

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
  "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&auto=format&fit=crop&q=80",
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
- For the image field, use a relevant Unsplash image URL that matches the recipe:
  * Format: https://images.unsplash.com/photo-[photo-id]?w=400&auto=format&fit=crop&q=80
  * Choose appropriate photo IDs for the dish type (e.g., pasta, pizza, salad, etc.)
  * Use different photo IDs for each recipe to provide variety
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
        
      // Validate each recipe has required fields and enhance images
      generatedRecipes = generatedRecipes.filter(recipe => {
        if (!recipe.name || !recipe.recipeIngredient || !recipe.recipeInstructions) {
          console.warn('Skipping invalid recipe:', recipe)
          return false
        }
        
        // Enhance image URL to be more relevant to the recipe
        if (recipe.image && typeof recipe.image === 'string') {
          recipe.image = enhanceImageUrl(recipe.name, recipe.recipeCategory, recipe.recipeCuisine)
        }
        
        // Optionally generate a custom DALL-E image (uncomment to enable)
        // try {
        //   const dalleImageUrl = await generateDalleImage(recipe.name, recipe.description)
        //   if (dalleImageUrl) {
        //     recipe.image = dalleImageUrl
        //   }
        // } catch (error) {
        //   console.warn('Failed to generate DALL-E image for recipe:', recipe.name, error)
        // }
        
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
