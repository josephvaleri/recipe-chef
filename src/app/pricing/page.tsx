import { createSupabaseServer } from '@/lib/supabase/server'
import { PricingSection } from '@/components/payments/pricing-section'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefHat, Check } from 'lucide-react'
import { PricingPageClient } from './pricing-client'

export default async function PricingPage() {
  const supabase = await createSupabaseServer()
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session
  
  // Get user profile if authenticated
  let profile = null
  let hasActiveSubscription = false
  
  if (isAuthenticated && session?.user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('status, paddle_subscription_id, trial_ends_at')
      .eq('user_id', session.user.id)
      .single()
    
    profile = profileData
    
    // User has active subscription if:
    // - status is 'active' (trial users should still be able to subscribe)
    hasActiveSubscription = profile?.status === 'active'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <PricingPageClient />
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
          {/* Left Panel - Chef Tony */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ChefOuiOui />
              
              {/* Trial Info */}
              {profile?.status === 'trial' && profile?.trial_ends_at && (
                <Card className="mt-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-2">🎉 Free Trial Active</h3>
                    <p className="text-orange-100 text-sm mb-4">
                      {(() => {
                        const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        return daysLeft > 0 ? `You have ${daysLeft} days left` : 'Trial ending soon'
                      })()}
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

            {/* Pricing Options */}
            <div className="space-y-6 mb-12">
              <PricingSection 
                isAuthenticated={isAuthenticated}
                hasActiveSubscription={hasActiveSubscription}
                userEmail={session?.user?.email}
                userId={session?.user?.id}
              />
            </div>

            {/* What's Included */}
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="text-center">What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Unlimited recipe storage</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>AI recipe creation</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Easy migration from Paprika</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Save recipes from web in one click</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Use Offline</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Unlimited community groups and sharing</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Friends and Follows</span>
                    </li>
                  </ul>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Become a verified chef</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Unlimited iOS and Android apps</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Recipe scaling & conversion</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Menu planning calendar</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>AI shopping lists</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>All premium features</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Renews automatically</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="mt-12">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What happens to my recipes after the trial?</h4>
                  <p className="text-gray-600 text-sm">
                    Your recipes are always safe with us. After your trial ends, your recipes will stay in our system for up to 6 months, in case you want to rejoin. After 6 months, or at any time upon your request, we will delete your account and recipes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Can I cancel my subscription anytime?</h4>
                  <p className="text-gray-600 text-sm">
                    Yes! You can cancel your subscription at any time. Your access will continue until the end of your current billing period, and you won't be charged again.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Is there a refund policy?</h4>
                  <p className="text-gray-600 text-sm">
                    We offer a 30-day money-back guarantee for all purchases. If you're not satisfied, contact our support team for a full refund.
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
