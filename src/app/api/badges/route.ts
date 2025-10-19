import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get all badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('badge_code')

    if (badgesError) {
      console.error('Error fetching badges:', badgesError)
      return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 })
    }

    // Get badge tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('badge_tiers')
      .select('*')
      .order('badge_code, tier')

    if (tiersError) {
      console.error('Error fetching badge tiers:', tiersError)
      return NextResponse.json({ error: 'Failed to fetch badge tiers' }, { status: 500 })
    }

    // Get user's badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false })

    if (userBadgesError) {
      console.error('Error fetching user badges:', userBadgesError)
      return NextResponse.json({ error: 'Failed to fetch user badges' }, { status: 500 })
    }

    // Get badge progress
    const { data: progress, error: progressError } = await supabase
      .rpc('get_badge_progress')

    if (progressError) {
      console.error('Error fetching badge progress:', progressError)
      return NextResponse.json({ error: 'Failed to fetch badge progress' }, { status: 500 })
    }

    return NextResponse.json({
      badges: badges || [],
      tiers: tiers || [],
      userBadges: userBadges || [],
      progress: progress || {}
    })

  } catch (error) {
    console.error('Badges API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
