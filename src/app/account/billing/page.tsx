import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChefHat, ArrowLeft, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default async function BillingPage() {
  const supabase = await createSupabaseServer()
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/signin?redirectTo=/account/billing')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, paddle_subscription_id')
    .eq('user_id', session.user.id)
    .single()

  const hasActiveSubscription = !!(
    profile?.status === 'active' || 
    profile?.paddle_subscription_id
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>Manage your Recipe Chef subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasActiveSubscription ? (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Active Subscription</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    Your subscription is active. To manage or cancel your subscription, please visit your Paddle customer portal.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-4">
                    Need to update your payment method or cancel your subscription? 
                    You can manage all billing settings through Paddle's customer portal.
                  </p>
                  <Button variant="outline" disabled>
                    Manage Subscription (Coming Soon)
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">No Active Subscription</h3>
                <p className="text-sm text-orange-700 mb-4">
                  You don't have an active subscription. Subscribe to unlock all Recipe Chef Pro features.
                </p>
                <Link href="/pricing">
                  <Button>View Pricing Plans</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

