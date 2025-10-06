import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'greeting' | 'joke' | 'tip' | null
    const locale = searchParams.get('locale') || 'en'

    if (!type || !['greeting', 'joke', 'tip'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('get_random_ouioui_line', {
      line_type: type,
      locale: locale
    })

    if (error) {
      console.error('Error fetching OuiOui line:', error)
      return NextResponse.json({ error: 'Failed to fetch line' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      // Fallback messages
      const fallbacks = {
        greeting: 'Bonjour! Welcome to Recipe Chef!',
        joke: 'Why don\'t eggs tell jokes? They\'d crack each other up!',
        tip: 'Always taste your food while cooking - your palate is your best guide!'
      }
      
      return NextResponse.json({
        text: fallbacks[type],
        type,
        locale: 'en',
        is_fallback: true
      })
    }

    return NextResponse.json({
      text: data[0].text,
      type,
      locale,
      is_fallback: false
    })

  } catch (error) {
    console.error('OuiOui API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
