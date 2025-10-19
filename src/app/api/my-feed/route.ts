import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromRequest } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  console.log('🔍 [MY-FEED API] Starting request...');
  try {
    const supabase = createServerClientFromRequest(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔍 [MY-FEED API] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.log('❌ [MY-FEED API] Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get feed events using the RPC function
    console.log('🔍 [MY-FEED API] Calling get_my_feed with user:', user.id, 'email:', user.email, 'limit:', limit);
    const { data: feedEvents, error } = await supabase.rpc('get_my_feed', {
      p_user: user.id,
      p_limit: limit
    })

    console.log('🔍 [MY-FEED API] RPC response:', { feedEvents, error });

    if (error) {
      console.error('My feed error:', error)
      return NextResponse.json({ error: 'Failed to get feed' }, { status: 500 })
    }

    console.log('🔍 [MY-FEED API] Raw feed events:', feedEvents);
    console.log('🔍 [MY-FEED API] Feed events length:', feedEvents?.length || 0);

    // Return events without enrichment for now (to fix the hanging issue)
    const responseData = { 
      events: feedEvents || [],
      total: (feedEvents || []).length
    }
    console.log('🔍 [MY-FEED API] Response data being sent:', responseData);
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('My feed API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClientFromRequest(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventIds } = body

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ error: 'Event IDs array is required' }, { status: 400 })
    }

    // Mark events as read
    const { error: updateError } = await supabase
      .from('feed_events')
      .update({ read_at: new Date().toISOString() })
      .in('event_id', eventIds)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to mark events as read' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Events marked as read',
      updated_count: eventIds.length
    })

  } catch (error) {
    console.error('Mark feed events as read API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
