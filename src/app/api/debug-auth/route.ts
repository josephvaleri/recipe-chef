import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  console.log('🔍 [DEBUG-AUTH] Starting authentication debug...');
  
  try {
    const supabase = createServerClientFromRequest(request);
    
    // 1. Check if we can get the user
    console.log('🔍 [DEBUG-AUTH] Checking user authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔍 [DEBUG-AUTH] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: authError?.message || 'No user found',
        step: 'user_auth'
      }, { status: 401 });
    }

    // 2. Check if we can access the profiles table
    console.log('🔍 [DEBUG-AUTH] Checking profiles table access...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, geo_opt_in, lat, lng, display_name')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 [DEBUG-AUTH] Profile result:', {
      hasProfile: !!profile,
      geo_opt_in: profile?.geo_opt_in,
      hasLocation: !!(profile?.lat && profile?.lng),
      profileError: profileError?.message
    });

    if (profileError) {
      return NextResponse.json({
        success: false,
        error: 'Profile access failed',
        details: profileError.message,
        step: 'profile_access',
        userId: user.id
      }, { status: 500 });
    }

    // 3. Test the database function directly
    console.log('🔍 [DEBUG-AUTH] Testing database function...');
    const { data: functionResult, error: functionError } = await supabase.rpc('discover_near_me_v2', {
      p_radius_km: 50
    });

    console.log('🔍 [DEBUG-AUTH] Function result:', {
      hasResult: !!functionResult,
      resultLength: functionResult?.length,
      functionError: functionError?.message
    });

    // 4. Check other users with location sharing
    console.log('🔍 [DEBUG-AUTH] Checking other users with location sharing...');
    const { data: otherUsers, error: otherUsersError } = await supabase
      .from('profiles')
      .select('user_id, geo_opt_in, lat, lng, display_name')
      .eq('geo_opt_in', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .neq('user_id', user.id);

    console.log('🔍 [DEBUG-AUTH] Other users result:', {
      hasOtherUsers: !!otherUsers,
      otherUsersCount: otherUsers?.length,
      otherUsersError: otherUsersError?.message
    });

    // Return comprehensive debug information
    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
          authenticated: true
        },
        profile: {
          exists: !!profile,
          geo_opt_in: profile?.geo_opt_in,
          hasLocation: !!(profile?.lat && profile?.lng),
          lat: profile?.lat,
          lng: profile?.lng,
          display_name: profile?.display_name
        },
        databaseFunction: {
          success: !functionError,
          error: functionError?.message,
          resultCount: functionResult?.length || 0,
          results: functionResult || []
        },
        otherUsers: {
          count: otherUsers?.length || 0,
          error: otherUsersError?.message,
          users: otherUsers || []
        },
        recommendations: generateRecommendations(profile, functionError, otherUsers)
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-AUTH] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      step: 'unexpected_error'
    }, { status: 500 });
  }
}

function generateRecommendations(profile: any, functionError: any, otherUsers: any[]) {
  const recommendations = [];
  
  if (!profile) {
    recommendations.push('User profile not found - this is a critical issue');
  } else if (!profile.geo_opt_in) {
    recommendations.push('Location sharing is disabled - enable it in profile settings');
  } else if (!profile.lat || !profile.lng) {
    recommendations.push('Location coordinates not set - add location in profile settings');
  }
  
  if (functionError) {
    if (functionError.message.includes('auth.uid()')) {
      recommendations.push('Database function cannot access user context - authentication not passed to database');
    } else {
      recommendations.push(`Database function error: ${functionError.message}`);
    }
  }
  
  if (!otherUsers || otherUsers.length === 0) {
    recommendations.push('No other users have location sharing enabled - this is why no results are returned');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All checks passed - the issue may be elsewhere');
  }
  
  return recommendations;
}
