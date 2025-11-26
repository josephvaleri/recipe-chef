export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'
const PADDLE_API_URL = PADDLE_ENV === 'production' 
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com'

// Price IDs from environment variables
const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY
const ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createSupabaseServer()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { planType } = await request.json()
    
    if (planType !== 'monthly' && planType !== 'annual') {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const priceId = planType === 'monthly' ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID
    
    if (!priceId) {
      return NextResponse.json({ 
        error: `Price ID not configured for ${planType} plan` 
      }, { status: 500 })
    }

    if (!PADDLE_API_KEY) {
      return NextResponse.json({ error: 'Paddle API key not configured' }, { status: 500 })
    }

    // Get origin for success URL
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const successUrl = `${origin}/pricing?success=true`

    // Create transaction with checkout URL using Paddle Billing API
    const response = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            price_id: priceId,
            quantity: 1,
          }
        ],
        customer_email: session.user.email,
        custom_data: {
          supabase_user_id: session.user.id,
          app: 'RecipeChef',
        },
        checkout: {
          url: successUrl,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Paddle API error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to create checkout session',
        details: errorData 
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Get checkout URL from transaction response
    // Paddle returns checkout URL in different possible locations
    const checkoutUrl = data.data?.checkout?.url || 
                        data.data?.urls?.checkout_url ||
                        data.data?.checkout_url ||
                        data.checkout?.url
    
    if (!checkoutUrl) {
      console.error('No checkout URL in Paddle response:', JSON.stringify(data, null, 2))
      return NextResponse.json({ 
        error: 'No checkout URL returned from Paddle. Please ensure Default Checkout URL is set in Paddle Dashboard.',
        response: data
      }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    }, { status: 500 })
  }
}

