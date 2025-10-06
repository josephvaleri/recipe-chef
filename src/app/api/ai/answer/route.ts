import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase-server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Get the server-side Supabase client and check authentication
    const supabase = createServerClient()
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

    const { question, recipe } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Build context about the recipe
    let context = ''
    if (recipe) {
      context = `
Recipe: ${recipe.title}
${recipe.description ? `Description: ${recipe.description}` : ''}
${recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : ''}
      `.trim()
    }

    const systemPrompt = `You are Chef OuiOui, a friendly French chef assistant. Help users with cooking questions related to their recipes. Be encouraging, practical, and share cooking wisdom. Keep responses concise but helpful. If the question isn't about cooking or recipes, politely redirect to cooking topics.

${context ? `Current recipe context:\n${context}` : ''}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const answer = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t process your question right now.'

    // Log the interaction for analytics
    await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        query: question,
        result_source: 'openai'
      })

    return NextResponse.json({ answer })

  } catch (error) {
    console.error('AI answer error:', error)
    return NextResponse.json({ error: 'Failed to get AI answer' }, { status: 500 })
  }
}
