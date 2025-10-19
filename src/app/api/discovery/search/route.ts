import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromRequest } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] Search Profiles API called`)
    
    // Step 1: Enhanced Authentication with detailed logging
    const supabase = createServerClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log(`[${requestId}] Auth check - user:`, user?.id, 'error:', authError)
    
    if (authError) {
      console.error(`[${requestId}] Auth error:`, authError)
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 })
    }
    
    if (!user) {
      console.log(`[${requestId}] No authenticated user found`)
      return NextResponse.json({ 
        error: 'Unauthorized - Please log in to search profiles' 
      }, { status: 401 })
    }
    
    console.log(`[${requestId}] Authentication successful for user:`, user.id)
    
    // Step 2: Validate and parse parameters
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim()
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 100) : 20
    
    console.log(`[${requestId}] Parameters - query: "${query}", limit:`, limit)
    
    // Step 3: Validate query length
    if (query.length < 2) {
      console.log(`[${requestId}] Query too short (${query.length} chars)`)
      return NextResponse.json({ 
        people: [],
        message: 'Please enter at least 2 characters to search'
      })
    }
    
    // Step 4: Verify user profile exists
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name, visibility')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      console.error(`[${requestId}] User profile not found:`, profileError)
      return NextResponse.json({ 
        error: 'User profile not found. Please complete your profile setup.' 
      }, { status: 404 })
    }
    
    console.log(`[${requestId}] User profile verified:`, userProfile.display_name)
    
    // Step 5: Call the search_profiles RPC function
    console.log(`[${requestId}] Calling search_profiles RPC with query: "${query}"`)
    const { data: searchResults, error: rpcError } = await supabase.rpc('search_profiles', {
      p_query: query,
      p_viewer_id: user.id,
      p_limit: limit
    })
    
    console.log(`[${requestId}] RPC result count:`, searchResults?.length || 0)
    
    if (rpcError) {
      console.error(`[${requestId}] RPC error:`, rpcError)
      return NextResponse.json({ 
        error: 'Failed to search profiles', 
        details: rpcError.message 
      }, { status: 500 })
    }
    
    // Step 6: Handle empty results
    if (!searchResults || searchResults.length === 0) {
      console.log(`[${requestId}] No profiles found for query: "${query}"`)
      return NextResponse.json({ 
        people: [],
        message: `No profiles found matching "${query}"`
      })
    }
    
    // Step 7: Format and enrich results
    const formattedPeople = searchResults.map((result: any) => ({
      user_id: result.user_id,
      display_name: result.display_name || result.full_name || 'Anonymous',
      full_name: result.full_name,
      avatar_url: result.avatar_url,
      visibility: result.visibility,
      is_visible: result.is_visible,
      diet: result.diet,
      skill_level: result.skill_level,
      favorite_cuisine: result.favorite_cuisine
    })).filter(profile => profile.is_visible) // Only show public profiles
    
    console.log(`[${requestId}] Returning ${formattedPeople.length} search results`)
    
    return NextResponse.json({ 
      people: formattedPeople,
      total: formattedPeople.length,
      query: query,
      request_id: requestId
    })

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      request_id: requestId
    }, { status: 500 })
  }
}