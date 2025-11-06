export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { regionHeader } from '@/lib/route-config'
import { z } from 'zod'

const privacySchema = z.object({
  visibility: z.enum(['NO_VISIBILITY', 'FRIENDS_ONLY', 'FRIENDS_AND_FOLLOWERS', 'ANYONE']),
  geo_opt_in: z.boolean().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  diet: z.string().optional(),
  skill_level: z.string().optional(),
  favorite_cuisine: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's privacy settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        visibility,
        geo_opt_in,
        lat,
        lng,
        diet,
        skill_level,
        favorite_cuisine
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('Get privacy settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updateData = privacySchema.parse(body)

    // Validate location data if geo_opt_in is true
    if (updateData.geo_opt_in && (updateData.lat === undefined || updateData.lng === undefined)) {
      return NextResponse.json({ 
        error: 'Latitude and longitude are required when enabling location sharing' 
      }, { status: 400 })
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Privacy settings updated',
      profile: updatedProfile
    }, { headers: regionHeader() })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Update privacy settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
