import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const followSchema = z.object({
  followeeId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { followeeId } = followSchema.parse(body)

    // Check if user is trying to follow themselves
    if (user.id === followeeId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Check if followee exists
    const { data: followee, error: followeeError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', followeeId)
      .single()

    if (followeeError || !followee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Insert follow relationship
    const { error: followError } = await supabase
      .from('user_follows')
      .insert({
        follower_id: user.id,
        followee_id: followeeId
      })

    if (followError) {
      if (followError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Already following this user' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Successfully followed user' })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Follow API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { followeeId } = followSchema.parse(body)

    // Remove follow relationship
    const { error: unfollowError } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followee_id', followeeId)

    if (unfollowError) {
      return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Successfully unfollowed user' })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Unfollow API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
