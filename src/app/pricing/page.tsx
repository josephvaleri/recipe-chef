'use client'

import { PaddleCheckout } from '@/components/payments/paddle-checkout'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentProfile } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ChefHat, ArrowLeft, Star, Check, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function PricingPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profileData = await getCurrentProfile()
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Unlimited recipe storage',
    'Advanced search & filtering',
    'Recipe scaling & unit conversion',
    'PDF export & printing',
    'Menu planning calendar',
    'Smart shopping lists',
    'Offline access',
    'Recipe import from web',
    'Voice search',
    'Priority support'
  ]

  const aiFeatures = [
    'Natural language recipe search',
    'Recipe recommendations',
    'Cooking tips & advice',
    'Ingredient substitutions',
    'Recipe Q&A',
    'Nutritional insights',
    'Personalized suggestions',
    'Cooking troubleshooting'
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Pricing</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Panel - Chef OuiOui */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ChefOuiOui />
              
              {/* Trial Info */}
              {profile?.status === 'trial' && (
                <Card className="mt-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-2">🎉 Free Trial Active</h3>
                    <p className="text-orange-100 text-sm mb-4">
                      You have {Math.ceil((new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                    </p>
                    <p className="text-orange-100 text-xs">
                      Upgrade anytime to keep all your recipes and unlock premium features
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Panel - Pricing */}
          <div className="lg:col-span-2">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Choose Your Recipe Chef Plan
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Transform your cooking experience with our powerful recipe management tools
              </p>
            </div>

            {/* Features Comparison */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-center">What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-orange-500" />
                      Recipe Chef Pro
                    </h3>
                    <ul className="space-y-2">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-orange-500" />
                      AI Assistant (Add-on)
                    </h3>
                    <ul className="space-y-2">
                      {aiFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Options */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center text-gray-900">
                Ready to Upgrade?
              </h3>
              <PaddleCheckout 
                onSuccess={() => {
                  alert('Payment successful! Welcome to Recipe Chef Pro!')
                  router.push('/cookbook')
                }}
              />
            </div>

            {/* FAQ */}
            <Card className="mt-12">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What happens to my recipes after the trial?</h4>
                  <p className="text-gray-600 text-sm">
                    Your recipes are always safe with us. After your trial ends, you'll still have access to view and export your recipes, but you'll need to upgrade to continue adding new ones or using premium features.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Can I cancel my subscription anytime?</h4>
                  <p className="text-gray-600 text-sm">
                    Yes! You can cancel your AI subscription at any time. Your one-time Pro purchase gives you lifetime access to all core features.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Is there a refund policy?</h4>
                  <p className="text-gray-600 text-sm">
                    We offer a 30-day money-back guarantee for all purchases. If you're not satisfied, contact our support team for a full refund.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Do you offer student discounts?</h4>
                  <p className="text-gray-600 text-sm">
                    Yes! Students and educators can get 50% off the Pro plan. Contact us with your student ID or educational email for verification.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
