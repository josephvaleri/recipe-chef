'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { CreditCard, Zap, Star, Check } from 'lucide-react'

interface PricingPlan {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
}

interface PaddleCheckoutProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function PaddleCheckout({ onSuccess, onCancel }: PaddleCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pricing, setPricing] = useState<{ one_time: number; monthly_ai: number }>({
    one_time: 9.99,
    monthly_ai: 0.99
  })

  useEffect(() => {
    loadUserData()
    loadPricing()
  }, [])

  const loadUserData = async () => {
    const userData = await getCurrentUser()
    const profileData = await getCurrentUser()
    setUser(userData)
    setProfile(profileData)
  }

  const loadPricing = async () => {
    try {
      // In a real app, you'd fetch this from your API
      // For now, use environment variables or defaults
      setPricing({
        one_time: parseFloat(process.env.NEXT_PUBLIC_PADDLE_PRICE_ONE_TIME_USD || '9.99'),
        monthly_ai: parseFloat(process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY_AI_USD || '0.99')
      })
    } catch (error) {
      console.error('Error loading pricing:', error)
    }
  }

  const initializePaddle = () => {
    if (typeof window === 'undefined' || !window.Paddle) {
      console.error('Paddle SDK not loaded')
      return null
    }

    return window.Paddle.Setup({
      vendor: parseInt(process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID || '0'),
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'live' ? 'live' : 'sandbox'
    })
  }

  const handleOneTimePurchase = async () => {
    if (!user || !profile) return

    setLoading(true)
    try {
      const paddle = initializePaddle()
      if (!paddle) {
        throw new Error('Paddle not available')
      }

      const checkoutOptions = {
        product: process.env.NEXT_PUBLIC_PADDLE_PRODUCT_ID_ONE_TIME || 'your-product-id',
        email: user.email,
        allowQuantity: false,
        disableLogout: true,
        customData: {
          user_id: user.id
        },
        eventCallback: (data: any) => {
          if (data.name === 'checkout.completed') {
            console.log('Checkout completed:', data)
            onSuccess?.()
          }
        }
      }

      paddle.Checkout.open(checkoutOptions)
    } catch (error) {
      console.error('Error opening checkout:', error)
      alert('Failed to open checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMonthlySubscription = async () => {
    if (!user || !profile) return

    setLoading(true)
    try {
      const paddle = initializePaddle()
      if (!paddle) {
        throw new Error('Paddle not available')
      }

      const checkoutOptions = {
        product: process.env.NEXT_PUBLIC_PADDLE_PRODUCT_ID_MONTHLY || 'your-subscription-id',
        email: user.email,
        allowQuantity: false,
        disableLogout: true,
        customData: {
          user_id: user.id
        },
        eventCallback: (data: any) => {
          if (data.name === 'checkout.completed') {
            console.log('Subscription created:', data)
            onSuccess?.()
          }
        }
      }

      paddle.Checkout.open(checkoutOptions)
    } catch (error) {
      console.error('Error opening subscription checkout:', error)
      alert('Failed to open checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const plans: PricingPlan[] = [
    {
      id: 'one-time',
      name: 'Recipe Chef Pro',
      price: pricing.one_time,
      description: 'Unlock all features with a one-time purchase',
      features: [
        'Unlimited recipe storage',
        'Advanced search & filters',
        'Recipe scaling & conversion',
        'PDF export',
        'Menu planning calendar',
        'Shopping list generation',
        'Offline access',
        'Priority support'
      ],
      popular: true
    },
    {
      id: 'monthly-ai',
      name: 'AI Assistant',
      price: pricing.monthly_ai,
      description: 'Add AI-powered recipe assistance',
      features: [
        'Natural language recipe search',
        'Recipe recommendations',
        'Cooking tips & advice',
        'Ingredient substitutions',
        'Recipe Q&A',
        'Nutritional insights',
        'Personalized suggestions'
      ]
    }
  ]

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Please sign in to view pricing options.</p>
        </CardContent>
      </Card>
    )
  }

  if (profile?.status === 'active') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-green-600 mb-4">
            <Check className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">You're all set!</h3>
          </div>
          <p className="text-gray-600 mb-4">
            You have access to all Recipe Chef Pro features.
          </p>
          {profile.has_ai_subscription && (
            <p className="text-sm text-orange-600">
              ✨ AI Assistant is active
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

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
              <span className="text-gray-500">
                {plan.id === 'one-time' ? 'one-time' : '/month'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={plan.id === 'one-time' ? handleOneTimePurchase : handleMonthlySubscription}
              disabled={loading}
              className="w-full"
              variant={plan.popular ? 'default' : 'outline'}
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {plan.id === 'one-time' ? 'Buy Now' : 'Subscribe'}
                </>
              )}
            </Button>
            {plan.id === 'monthly-ai' && (
              <p className="text-xs text-gray-500 text-center">
                Requires Recipe Chef Pro
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Extend Window interface for Paddle
declare global {
  interface Window {
    Paddle: any
  }
}
