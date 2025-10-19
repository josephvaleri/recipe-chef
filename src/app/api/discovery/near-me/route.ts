import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest } from '@/lib/supabase-server';
import { z } from 'zod';

const q = z.object({ 
  radiusKm: z.coerce.number().min(1).max(1000).default(50),
  limit: z.coerce.number().min(1).max(100).default(20)
});

export async function GET(request: NextRequest) {
  console.log('🔍 [NEAR-ME API] Starting request...');
  console.log('🔍 [NEAR-ME API] Route is being called!');
  try {
    const supabase = createServerClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('🔍 [NEAR-ME API] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });

    if (authError || !user) {
      console.log('❌ [NEAR-ME API] Auth failed');
      return NextResponse.json({
        error: 'Unauthorized - Please log in to discover people near you'
      }, { status: 401 });
    }

    // Debug: Check user's profile data
    console.log('🔍 [NEAR-ME API] Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('geo_opt_in, lat, lng, display_name')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 [NEAR-ME API] Profile data:', {
      userId: user.id,
      geo_opt_in: profile?.geo_opt_in,
      lat: profile?.lat,
      lng: profile?.lng,
      display_name: profile?.display_name,
      profileError: profileError?.message
    });

    if (profileError) {
      console.error('❌ [NEAR-ME API] Profile error:', profileError);
      return NextResponse.json({
        error: 'Failed to load profile',
        details: profileError.message
      }, { status: 500 });
    }

    // Check if user has location sharing enabled
    if (!profile?.geo_opt_in) {
      console.log('❌ [NEAR-ME API] User has not enabled location sharing');
      return NextResponse.json({
        error: 'Location sharing not enabled',
        details: 'Please enable location sharing in your profile to use the Near Me feature'
      }, { status: 403 });
    }

    // Check if user has coordinates set
    if (!profile?.lat || !profile?.lng) {
      console.log('❌ [NEAR-ME API] User has no coordinates set');
      return NextResponse.json({
        error: 'Location not set',
        details: 'Please set your location in your profile to use the Near Me feature'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = q.safeParse({ 
      radiusKm: searchParams.get('radiusKm') ?? undefined,
      limit: searchParams.get('limit') ?? undefined
    });
    if (!parsed.success) {
      console.log('❌ [NEAR-ME API] Bad request parameters');
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    console.log('🔍 [NEAR-ME API] Calling discover_near_me_v2 with:', {
      p_radius_km: parsed.data.radiusKm
    });

    const { data, error } = await supabase.rpc('discover_near_me_v2', {
      p_radius_km: parsed.data.radiusKm
    });

    console.log('🔍 [NEAR-ME API] Database function result:', { 
      data: data, 
      dataLength: data?.length,
      error: error,
      errorMessage: error?.message 
    });

    if (error) {
      console.error('❌ [NEAR-ME API] Database function error:', error);
      return NextResponse.json({
        error: 'Database error',
        details: error.message
      }, { status: 500 });
    }

    // If no data is returned, it could mean:
    // 1. User doesn't have location sharing enabled
    // 2. No other users nearby with location sharing enabled
    // 3. User has location sharing enabled but no coordinates set
    console.log('✅ [NEAR-ME API] Returning people data:', { 
      people: data ?? [], 
      count: (data ?? []).length 
    });
    return NextResponse.json({ people: data ?? [] });

  } catch (error) {
    console.error('❌ [NEAR-ME API] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}