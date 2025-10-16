import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Get the server-side Supabase client and check authentication
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Clean up expired cache entries
    const { data: deletedCount, error: cleanupError } = await supabase
      .rpc('cleanup_expired_cache')

    if (cleanupError) {
      console.error('Error cleaning up cache:', cleanupError)
      return NextResponse.json({ error: 'Failed to cleanup cache' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Cache cleanup completed',
      deletedEntries: deletedCount || 0
    })

  } catch (error) {
    console.error('Cache cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
