import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromRequest } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const requestId = `friends-invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] Friends invite API called`)
    
    // Step 1: Authentication
    const authSupabase = createServerClientFromRequest(request)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      console.log(`[${requestId}] Authentication failed`)
      return NextResponse.json({ 
        error: 'Unauthorized - Please log in to send friend invitations' 
      }, { status: 401 })
    }
    
    console.log(`[${requestId}] Authentication successful for user:`, user.id)
    
    // Step 2: Parse request body
    const body = await request.json()
    const { inviteeId, note } = body
    
    if (!inviteeId) {
      return NextResponse.json({ 
        error: 'Missing inviteeId parameter' 
      }, { status: 400 })
    }
    
    if (inviteeId === user.id) {
      return NextResponse.json({ 
        error: 'Cannot send friend invitation to yourself' 
      }, { status: 400 })
    }
    
    console.log(`[${requestId}] Sending invitation from ${user.id} to ${inviteeId}`)
    
    // Step 3: Create service client for database operations
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Step 4: Verify invitee exists
    const { data: inviteeProfile, error: inviteeError } = await serviceSupabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('user_id', inviteeId)
      .single()
    
    if (inviteeError || !inviteeProfile) {
      console.error(`[${requestId}] Invitee not found:`, inviteeError)
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }
    
    console.log(`[${requestId}] Invitee found:`, inviteeProfile.display_name)
    
    // Step 5: Check if invitation already exists
    const { data: existingInvitation, error: checkError } = await serviceSupabase
      .from('friend_invitations')
      .select('invitation_id, status')
      .eq('inviter_id', user.id)
      .eq('invitee_id', inviteeId)
      .single()
    
    if (existingInvitation) {
      if (existingInvitation.status === 'PENDING') {
        return NextResponse.json({ 
          error: 'Friend invitation already sent' 
        }, { status: 409 })
      } else if (existingInvitation.status === 'ACCEPTED') {
        return NextResponse.json({ 
          error: 'You are already friends with this user' 
        }, { status: 409 })
      }
    }
    
    // Step 6: Create friend invitation
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('friend_invitations')
      .insert({
        inviter_id: user.id,
        invitee_id: inviteeId,
        note: note || null,
        status: 'PENDING'
      })
      .select()
      .single()
    
    if (inviteError) {
      console.error(`[${requestId}] Failed to create invitation:`, inviteError)
      return NextResponse.json({ 
        error: 'Failed to send friend invitation', 
        details: inviteError.message 
      }, { status: 500 })
    }
    
    console.log(`[${requestId}] Friend invitation created successfully:`, invitation.invitation_id)
    
    return NextResponse.json({ 
      success: true,
      invitation: {
        invitation_id: invitation.invitation_id,
        inviter_id: invitation.inviter_id,
        invitee_id: invitation.invitee_id,
        note: invitation.note,
        status: invitation.status,
        created_at: invitation.created_at
      },
      invitee: {
        user_id: inviteeProfile.user_id,
        display_name: inviteeProfile.display_name
      },
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