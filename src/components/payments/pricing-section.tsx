'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Star, Check, Settings } from 'lucide-react'
import { paddleHostedCheckout, isCheckoutConfigured } from '@/lib/payments'

interface PricingSectionProps {
  isAuthenticated: boolean
  hasActiveSubscription: boolean
  userEmail?: string | null
  userId?: string | null
}

interface PricingPlan {
  id: 'monthly' | 'annual'
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular?: boolean
}

const plans: PricingPlan[] = [
  {
    id: 'annual',
    name: 'Recipe Chef Annual',
    price: 9.99,
    period: '/year',
    description: 'Best value - Save with annual billing',
    features: [], // Features shown in separate section below
    popular: true
  },
  {
    id: 'monthly',
    name: 'Recipe Chef Monthly',
    price: 0.99,
    period: '/month',
    description: 'Flexible monthly subscription',
    features: [] // Features shown in separate section below
  }
]

export function PricingSection({ isAuthenticated, hasActiveSubscription, userEmail, userId }: PricingSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    // If not authenticated, redirect to sign-in with return path
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirectTo=${encodeURIComponent('/pricing')}`)
      return
    }

    // If user has active subscription, show manage subscription
    if (hasActiveSubscription) {
      router.push('/account/billing')
      return
    }

    // Set loading state
    setLoading(planType)

    try {
      // Try using API to create checkout session first (more reliable)
      try {
        const response = await fetch('/api/paddle/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planType }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl
            return
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.warn('API checkout creation failed, falling back to hosted URL:', errorData)
        }
      } catch (apiError) {
        console.warn('API checkout creation error, falling back to hosted URL:', apiError)
      }

      // Fallback to hosted checkout URL if API fails
      let checkoutUrl = paddleHostedCheckout[planType]
      
      if (!checkoutUrl) {
        console.error(`Checkout URL not configured for ${planType} plan`)
        alert('Checkout is not configured. Please contact support.')
        setLoading(null)
        return
      }

      // Append customer information and success URL as query parameters
      const urlParams = new URLSearchParams()
      
      // Required: Success URL for redirect after payment
      const successUrl = `${window.location.origin}/pricing?success=true`
      urlParams.append('success_url', successUrl)
      
      // Optional: Customer email if available
      if (userEmail) {
        urlParams.append('customer_email', userEmail)
      }
      
      // Add passthrough data (custom data) if user ID is available
      if (userId) {
        const passthrough = JSON.stringify({
          supabase_user_id: userId,
          app: 'RecipeChef'
        })
        urlParams.append('passthrough', passthrough)
      }

      // Append query parameters
      checkoutUrl = `${checkoutUrl}${checkoutUrl.includes('?') ? '&' : '?'}${urlParams.toString()}`

      // Redirect to Paddle hosted checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Error redirecting to checkout:', error)
      setLoading(null)
      alert('Failed to open checkout. Please try again.')
    }
  }

  // Show manage subscription message if user has active subscription
  if (hasActiveSubscription) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.popular ? 'ring-2 ring-orange-500' : ''}>
            {plan.popular && (
              <div className="bg-orange-500 text-white text-center py-1 text-sm font-medium">
                Most Popular
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{plan.name}</span>
                {plan.popular && <Star className="w-5 h-5 text-orange-500" />}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.features.length > 0 && (
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className="w-full"
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Show subscription plans
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {plans.map((plan) => {
        const isPlanLoading = loading === plan.id
        const checkoutConfigured = isCheckoutConfigured()
        
        return (
          <Card key={plan.id} className={plan.popular ? 'ring-2 ring-orange-500' : ''}>
            {plan.popular && (
              <div className="bg-orange-500 text-white text-center py-1 text-sm font-medium">
                Most Popular
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{plan.name}</span>
                {plan.popular && <Star className="w-5 h-5 text-orange-500" />}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.features.length > 0 && (
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isPlanLoading || !checkoutConfigured}
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                title={!checkoutConfigured ? 'Checkout not configured' : undefined}
              >
                {isPlanLoading ? (
                  'Redirecting...'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isAuthenticated ? 'Subscribe' : 'Sign In to Subscribe'}
                  </>
                )}
              </Button>
              {plan.id === 'annual' && (
                <p className="text-xs text-gray-500 text-center">
                  Save with annual billing
                </p>
              )}
              {!checkoutConfigured && (
                <p className="text-xs text-red-500 text-center">
                  Checkout URLs not configured
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

