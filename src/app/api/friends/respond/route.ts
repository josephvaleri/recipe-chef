import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromRequest } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const requestId = `friends-respond-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[${requestId}] Friends respond API called`)
    
    // Step 1: Authentication
    const authSupabase = createServerClientFromRequest(request)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      console.log(`[${requestId}] Authentication failed`)
      return NextResponse.json({ 
        error: 'Unauthorized - Please log in to respond to invitations' 
      }, { status: 401 })
    }
    
    console.log(`[${requestId}] Authentication successful for user:`, user.id)
    
    // Step 2: Parse request body
    const body = await request.json()
    const { invitationId, action } = body
    
    if (!invitationId || !action) {
      return NextResponse.json({ 
        error: 'Missing invitationId or action parameter' 
      }, { status: 400 })
    }
    
    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be ACCEPT or DECLINE' 
      }, { status: 400 })
    }
    
    console.log(`[${requestId}] Responding to invitation ${invitationId} with action: ${action}`)
    
    // Step 3: Create service client for database operations
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Step 4: Get invitation details
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('friend_invitations')
      .select('*')
      .eq('invitation_id', invitationId)
      .eq('invitee_id', user.id) // Only the invitee can respond
      .single()
    
    if (inviteError || !invitation) {
      console.error(`[${requestId}] Invitation not found:`, inviteError)
      return NextResponse.json({ 
        error: 'Invitation not found or you are not authorized to respond' 
      }, { status: 404 })
    }
    
    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Invitation has already been responded to' 
      }, { status: 409 })
    }
    
    console.log(`[${requestId}] Found invitation from ${invitation.inviter_id}`)
    
    // Step 5: Update invitation status
    const { data: updatedInvitation, error: updateError } = await serviceSupabase
      .from('friend_invitations')
      .update({ 
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED',
        responded_at: new Date().toISOString()
      })
      .eq('invitation_id', invitationId)
      .select()
      .single()
    
    if (updateError) {
      console.error(`[${requestId}] Failed to update invitation:`, updateError)
      return NextResponse.json({ 
        error: 'Failed to respond to invitation', 
        details: updateError.message 
      }, { status: 500 })
    }
    
    // Step 6: If accepted, create friendship
    if (action === 'ACCEPT') {
      const { error: friendshipError } = await serviceSupabase
        .from('friendships')
        .insert([
          {
            user_id: invitation.inviter_id,
            friend_id: invitation.invitee_id,
            created_at: new Date().toISOString()
          },
          {
            user_id: invitation.invitee_id,
            friend_id: invitation.inviter_id,
            created_at: new Date().toISOString()
          }
        ])
      
      if (friendshipError) {
        console.error(`[${requestId}] Failed to create friendship:`, friendshipError)
        // Don't fail the request, just log the error
      } else {
        console.log(`[${requestId}] Friendship created successfully`)
      }
    }
    
    console.log(`[${requestId}] Invitation ${action.toLowerCase()}ed successfully`)
    
    return NextResponse.json({ 
      success: true,
      invitation: {
        invitation_id: updatedInvitation.invitation_id,
        inviter_id: updatedInvitation.inviter_id,
        invitee_id: updatedInvitation.invitee_id,
        status: updatedInvitation.status,
        responded_at: updatedInvitation.responded_at
      },
      action: action,
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