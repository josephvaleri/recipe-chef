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

    const { question } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Step 1: Classify the question type and determine search strategy
    const classificationPrompt = `Analyze this user question and determine the search strategy:

Question: "${question}"

Classify into one of these categories:
1. "recipe_name_search" - User is asking for a specific recipe by name (e.g., "spaghetti alla vongole", "chicken parmesan", "beef wellington", "give me recipes for carbonara")
2. "ingredient_search" - User is asking what they can make with specific ingredients (e.g., "what can I make with chicken and rice", "recipes that use chicken and rice", "I want an Italian recipe that has chicken and rice")
3. "cooking_question" - User has a general cooking/food question (e.g., "how to store herbs", "what's the difference between baking soda and powder", "cooking tips")
4. "not_food_related" - Question is not about food, cooking, recipes, or cuisine

Respond with ONLY the category name (recipe_name_search, ingredient_search, cooking_question, or not_food_related).`

    const classification = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: classificationPrompt }],
      max_tokens: 10,
      temperature: 0.1,
    })

    const questionType = classification.choices[0]?.message?.content?.trim().toLowerCase()

    // Handle non-food related questions
    if (questionType === 'not_food_related') {
      return NextResponse.json({
        type: 'not_food_related',
        message: 'Please ask a recipe or food related question. I\'m Chef Tony, your cooking assistant!'
      })
    }

    // Handle recipe name search - use fuzzy search with 75% threshold
    if (questionType === 'recipe_name_search') {
      // Clean the recipe name for search
      const cleanRecipeName = question
        .toLowerCase()
        .replace(/give me recipes? for/gi, '')
        .replace(/recipes? for/gi, '')
        .replace(/how to make/gi, '')
        .replace(/how to cook/gi, '')
        .trim()

      // Call the new recipe name search API
      const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ai/search-recipe-names`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.headers.get('authorization') || ''}`
        },
        body: JSON.stringify({ recipeName: cleanRecipeName }),
      })

      const searchData = await searchResponse.json()

      if (!searchResponse.ok) {
        console.error('Recipe name search error:', searchData)
        // Fallback to redirect if search fails
        return NextResponse.json({
          type: 'recipe_name_search',
          action: 'redirect_to_finder',
          searchQuery: question,
          source: 'recipe_name_search'
        })
      }

      // Return the search results directly
      return NextResponse.json({
        type: 'recipe_name_search',
        action: 'display_results',
        searchQuery: question,
        source: 'recipe_name_search',
        results: searchData
      })
    }

    // Handle ingredient search - use ingredient parsing logic
    if (questionType === 'ingredient_search') {
      return NextResponse.json({
        type: 'ingredient_search',
        action: 'redirect_to_finder',
        searchQuery: question,
        source: 'ingredient_search'
      })
    }

    // Handle general cooking questions
    if (questionType === 'cooking_question') {
      const enhancedPrompt = `Enhance this cooking question for optimal AI performance: "${question}"

Make it more specific and detailed while keeping the user's intent. Add context about cooking techniques, ingredients, or methods that would help provide a comprehensive answer.`

      const enhancedQuestion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: enhancedPrompt }],
        max_tokens: 100,
        temperature: 0.3,
      })

      const systemPrompt = `You are Chef Tony, a friendly French chef assistant with decades of culinary experience. Answer cooking and food questions with practical, encouraging advice. Be specific about techniques, temperatures, and methods. Share your expertise while being approachable and helpful.`

      const answer = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedQuestion.choices[0]?.message?.content || question }
        ],
        max_tokens: 500,
        temperature: 0.7,
      })

      // Log the interaction for analytics
      await supabase
        .from('ai_feedback')
        .insert({
          user_id: user.id,
          query: question,
          result_source: 'openai_cooking_advice'
        })

      return NextResponse.json({
        type: 'cooking_question',
        answer: answer.choices[0]?.message?.content || 'Sorry, I couldn\'t process your question right now.'
      }, { headers: regionHeader() })
    }

    // Fallback
    return NextResponse.json({
      type: 'unknown',
      message: 'I\'m not sure how to help with that. Please ask about recipes or cooking!'
    }, { headers: regionHeader() })

  } catch (error) {
    console.error('AI routing error:', error)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}