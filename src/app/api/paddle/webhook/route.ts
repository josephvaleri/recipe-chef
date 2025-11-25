export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { regionHeader } from '@/lib/route-config'
import crypto from 'crypto'

const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET!

// Paddle Billing webhook signature verification
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  
  try {
    // Parse signature header: "ts=<timestamp>,h1=<signature>"
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((kv) => {
        const [k, v] = kv.split('=')
        return [k.trim(), v.trim()]
      })
    )

    if (!parts.ts || !parts.h1) {
      console.error('Invalid signature format: missing ts or h1')
      return false
    }

    // Verify signature: HMAC-SHA256(ts + ':' + rawBody, secret)
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(`${parts.ts}:${rawBody}`)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(parts.h1), Buffer.from(expected))
  } catch (error) {
    console.error('Error verifying Paddle signature:', error)
    return false
  }
}

// Create Supabase server client with service role key for admin operations
function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return '' },
        set() {},
        remove() {},
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('Paddle-Signature')

    if (!WEBHOOK_SECRET) {
      console.error('Missing Paddle webhook secret')
      return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
    }

    if (!verifySignature(rawBody, signature)) {
      console.error('Invalid Paddle signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const type = event.event_type as string
    const data = event.data

    console.log('Paddle webhook received:', type)

    // Extract supabase_user_id from custom_data or metadata
    const customData = data?.custom_data ?? data?.metadata ?? {}
    const supabaseUserId = customData.supabase_user_id as string | undefined

    if (!supabaseUserId) {
      console.warn('No supabase_user_id found in webhook event:', type)
      // Still return success to avoid webhook retries for events without user context
      return NextResponse.json({ received: true, warning: 'No user ID found' }, { headers: regionHeader() })
    }

    // Handle different event types
    switch (type) {
      case 'transaction.completed':
        await handleTransactionCompleted(data, supabaseUserId)
        break
      case 'transaction.updated':
        await handleTransactionUpdated(data, supabaseUserId)
        break
      case 'subscription.created':
        await handleSubscriptionCreated(data, supabaseUserId)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(data, supabaseUserId)
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(data, supabaseUserId)
        break
      default:
        console.log('Unhandled event type:', type)
    }

    return NextResponse.json({ received: true }, { headers: regionHeader() })
  } catch (error) {
    console.error('Paddle webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleTransactionCompleted(transaction: any, supabaseUserId: string) {
  try {
    const supabase = createSupabaseAdmin()

    // Update user status to active and upgrade role from trial
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        role: 'user', // Upgrade from trial to user
        trial_ends_at: null, // Remove trial end date
        paddle_subscription_id: transaction.subscription_id ?? null
      })
      .eq('user_id', supabaseUserId)

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return
    }

    console.log('User activated:', supabaseUserId)
  } catch (error) {
    console.error('Error handling transaction completed:', error)
  }
}

async function handleTransactionUpdated(transaction: any, supabaseUserId: string) {
  // Handle transaction updates if needed
  console.log('Transaction updated:', transaction.id, 'for user:', supabaseUserId)
}

async function handleSubscriptionCreated(subscription: any, supabaseUserId: string) {
  try {
    const supabase = createSupabaseAdmin()

    // Enable AI subscription and store subscription ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        has_ai_subscription: true,
        paddle_subscription_id: subscription.id
      })
      .eq('user_id', supabaseUserId)

    if (updateError) {
      console.error('Error enabling AI subscription:', updateError)
      return
    }

    console.log('AI subscription enabled for user:', supabaseUserId)
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any, supabaseUserId: string) {
  try {
    const supabase = createSupabaseAdmin()

    // Update AI subscription status based on subscription status
    const hasAI = subscription.status === 'active'
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        has_ai_subscription: hasAI,
        paddle_subscription_id: subscription.id
      })
      .eq('user_id', supabaseUserId)

    if (updateError) {
      console.error('Error updating AI subscription:', updateError)
      return
    }

    console.log('AI subscription updated for user:', supabaseUserId, 'Status:', hasAI)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionCanceled(subscription: any, supabaseUserId: string) {
  try {
    const supabase = createSupabaseAdmin()

    // Disable AI subscription
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        has_ai_subscription: false
      })
      .eq('user_id', supabaseUserId)

    if (updateError) {
      console.error('Error disabling AI subscription:', updateError)
      return
    }

    console.log('AI subscription disabled for user:', supabaseUserId)
  } catch (error) {
    console.error('Error handling subscription canceled:', error)
  }
}
