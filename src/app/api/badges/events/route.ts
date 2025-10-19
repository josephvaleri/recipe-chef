import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromRequest } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { event_type, recipe_id, other_user_id, meta } = await request.json()

    if (!event_type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 })
    }

    // Log the event and award badges
    const { data, error } = await supabase.rpc('log_event_and_award', {
      p_type: event_type,
      p_recipe_id: recipe_id || null,
      p_other_user_id: other_user_id || null,
      p_meta: meta || {}
    })

    if (error) {
      console.error('Error logging event:', error)
      return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      event_id: data?.event_id,
      awards: data?.awards || []
    })

  } catch (error) {
    console.error('Badge events API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
