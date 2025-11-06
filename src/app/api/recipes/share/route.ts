export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { regionHeader } from '@/lib/route-config'
import { z } from 'zod'

const shareSchema = z.object({
  recipeId: z.number().int().positive(),
  recipients: z.array(z.string().uuid()).min(1),
  scope: z.enum(['FRIENDS', 'FOLLOWERS', 'BOTH']).optional(),
  note: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipeId, recipients, scope, note } = shareSchema.parse(body)

    // Check if recipe exists and user has access to it
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, user_id')
      .eq('user_recipe_id', recipeId)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // If scope is provided, resolve recipients based on scope
    let finalRecipients = recipients
    if (scope && scope !== 'FRIENDS' && scope !== 'FOLLOWERS' && scope !== 'BOTH') {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
    }

    if (scope) {
      const resolvedRecipients = await resolveRecipientsByScope(supabase, user.id, scope)
      finalRecipients = [...new Set([...recipients, ...resolvedRecipients])] // Combine and deduplicate
    }

    // Validate all recipients exist
    const { data: validRecipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('user_id')
      .in('user_id', finalRecipients)

    if (recipientsError) {
      return NextResponse.json({ error: 'Failed to validate recipients' }, { status: 500 })
    }

    const validRecipientIds = validRecipients?.map(r => r.user_id) || []
    const invalidRecipients = finalRecipients.filter(id => !validRecipientIds.includes(id))

    if (invalidRecipients.length > 0) {
      return NextResponse.json({ 
        error: 'Some recipients not found', 
        invalidRecipients 
      }, { status: 400 })
    }

    // Create direct shares
    const shares = validRecipientIds.map(recipientId => ({
      user_recipe_id: recipeId,
      sender_id: user.id,
      recipient_id: recipientId,
      message: note || null
    }))

    const { data: createdShares, error: sharesError } = await supabase
      .from('recipe_direct_shares')
      .insert(shares)
      .select()

    if (sharesError) {
      return NextResponse.json({ error: 'Failed to share recipe' }, { status: 500 })
    }

    // Create feed events for each recipient
    const feedEvents = await Promise.all(validRecipientIds.map(async recipientId => ({
      user_id: recipientId,
      kind: 'DIRECT_SHARE',
      payload: {
        user_recipe_id: recipeId,
        recipe_title: recipe.title,
        sender_id: user.id,
        sender_name: await getSafeDisplayName(supabase, recipientId, user.id),
        message: note,
        share_id: createdShares?.find(s => s.recipient_id === recipientId)?.share_id
      }
    })))

    const { error: feedError } = await supabase
      .from('feed_events')
      .insert(feedEvents)

    if (feedError) {
      console.error('Failed to create feed events:', feedError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recipe shared successfully',
      shares_created: createdShares?.length || 0
    }, { headers: regionHeader() })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Recipe share API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to resolve recipients by scope
async function resolveRecipientsByScope(supabase: any, userId: string, scope: string): Promise<string[]> {
  const recipients: string[] = []

  if (scope === 'FRIENDS' || scope === 'BOTH') {
    const { data: friends } = await supabase
      .from('user_friends')
      .select('friend_id')
      .eq('user_id', userId)
    
    if (friends) {
      recipients.push(...friends.map(f => f.friend_id))
    }
  }

  if (scope === 'FOLLOWERS' || scope === 'BOTH') {
    const { data: followers } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('followee_id', userId)
    
    if (followers) {
      recipients.push(...followers.map(f => f.follower_id))
    }
  }

  return recipients
}

// Helper function to get safe display name
async function getSafeDisplayName(supabase: any, viewerId: string, ownerId: string): Promise<string> {
  const { data } = await supabase.rpc('safe_display_name', {
    viewer: viewerId,
    owner: ownerId
  })
  return data || 'Anonymous'
}
