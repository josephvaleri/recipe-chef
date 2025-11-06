export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { regionHeader } from '@/lib/route-config'
import crypto from 'crypto'

// Paddle webhook verification
function verifyPaddleSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const digest = hmac.digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  } catch (error) {
    console.error('Error verifying Paddle signature:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('paddle-signature')

    if (!signature) {
      console.error('Missing Paddle signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const secret = process.env.PADDLE_WEBHOOK_SECRET
    if (!secret) {
      console.error('Missing Paddle webhook secret')
      return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
    }

    if (!verifyPaddleSignature(payload, signature, secret)) {
      console.error('Invalid Paddle signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(payload)
    console.log('Paddle webhook received:', event.event_type)

    // Handle different event types
    switch (event.event_type) {
      case 'transaction.completed':
        await handleTransactionCompleted(event.data)
        break
      case 'transaction.updated':
        await handleTransactionUpdated(event.data)
        break
      case 'subscription.created':
        await handleSubscriptionCreated(event.data)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data)
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data)
        break
      default:
        console.log('Unhandled event type:', event.event_type)
    }

    return NextResponse.json({ received: true }, { headers: regionHeader() })
  } catch (error) {
    console.error('Paddle webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleTransactionCompleted(transaction: any) {
  try {
    // Find user by customer_id or email
    const supabaseAdmin = createAdminClient()
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', transaction.customer_email)
      .single()

    if (userError || !user) {
      console.error('User not found for transaction:', transaction.id)
      return
    }

    // Update user status to active
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'active',
        trial_ends_at: null // Remove trial end date
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return
    }

    console.log('User activated:', user.user_id)
  } catch (error) {
    console.error('Error handling transaction completed:', error)
  }
}

async function handleTransactionUpdated(transaction: any) {
  // Handle transaction updates if needed
  console.log('Transaction updated:', transaction.id)
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    // Find user by customer_id
    const supabaseAdmin = createAdminClient()
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('customer_id', subscription.customer_id)
      .single()

    if (userError || !user) {
      console.error('User not found for subscription:', subscription.id)
      return
    }

    // Enable AI subscription
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        has_ai_subscription: true
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error enabling AI subscription:', updateError)
      return
    }

    console.log('AI subscription enabled for user:', user.user_id)
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    // Find user by customer_id
    const supabaseAdmin = createAdminClient()
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('customer_id', subscription.customer_id)
      .single()

    if (userError || !user) {
      console.error('User not found for subscription update:', subscription.id)
      return
    }

    // Update AI subscription status based on subscription status
    const hasAI = subscription.status === 'active'
    
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        has_ai_subscription: hasAI
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error updating AI subscription:', updateError)
      return
    }

    console.log('AI subscription updated for user:', user.user_id, 'Status:', hasAI)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  try {
    // Find user by customer_id
    const supabaseAdmin = createAdminClient()
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('customer_id', subscription.customer_id)
      .single()

    if (userError || !user) {
      console.error('User not found for subscription cancellation:', subscription.id)
      return
    }

    // Disable AI subscription
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        has_ai_subscription: false
      })
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error('Error disabling AI subscription:', updateError)
      return
    }

    console.log('AI subscription disabled for user:', user.user_id)
  } catch (error) {
    console.error('Error handling subscription canceled:', error)
  }
}
