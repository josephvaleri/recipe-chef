'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile, Profile, isTrialExpired, canUseAI } from '@/lib/auth'
import { Paywall } from './paywall'
import { TrialBanner } from './trial-banner'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: ReactNode
  requireAuth?: boolean
  requireAI?: boolean
  showTrialBanner?: boolean
  className?: string
}

interface GuardState {
  isLoading: boolean
  user: any
  profile: Profile | null
  isAuthorized: boolean
  showPaywall: boolean
  showTrialBanner: boolean
}

export function RouteGuard({ 
  children, 
  requireAuth = true,
  requireAI = false,
  showTrialBanner = false,
  className = ""
}: RouteGuardProps) {
  const [state, setState] = useState<GuardState>({
    isLoading: true,
    user: null,
    profile: null,
    isAuthorized: false,
    showPaywall: false,
    showTrialBanner: false
  })
  
  const router = useRouter()

  useEffect(() => {
    checkAuthAndPermissions()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isAuthorized: false,
          showPaywall: false
        }))
      } else if (event === 'SIGNED_IN' && session?.user) {
        await checkAuthAndPermissions()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAuthAndPermissions = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user && requireAuth) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthorized: false,
          showPaywall: false
        }))
        router.push('/auth/signin')
        return
      }

      if (!user && !requireAuth) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          user: null,
          profile: null,
          isAuthorized: true,
          showPaywall: false,
          showTrialBanner: showTrialBanner
        }))
        return
      }

      // Get user profile
      const profile = await getCurrentProfile()
      
      if (!profile) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthorized: false,
          showPaywall: false
        }))
        return
      }

      // Check trial status
      const isExpired = isTrialExpired(profile)
      const hasAI = canUseAI(profile)
      
      // Determine authorization
      let isAuthorized = true
      let showPaywall = false
      let showTrialBanner = false

      if (requireAuth && !user) {
        isAuthorized = false
      } else if (requireAI && !hasAI) {
        if (profile.status === 'trial' && !isExpired) {
          // Trial user - show banner but allow access (except AI features)
          showTrialBanner = true
          isAuthorized = true
        } else if (profile.status === 'trial' && isExpired) {
          // Expired trial - show paywall
          showPaywall = true
          isAuthorized = false
        } else if (profile.status === 'inactive') {
          // Inactive user - show paywall
          showPaywall = true
          isAuthorized = false
        } else {
          // Active user without AI subscription
          isAuthorized = true
        }
      } else {
        // User is authorized
        isAuthorized = true
        if (profile.status === 'trial' && !isExpired && showTrialBanner) {
          showTrialBanner = true
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        user,
        profile,
        isAuthorized,
        showPaywall,
        showTrialBanner
      }))

    } catch (error) {
      console.error('Route guard error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthorized: false,
        showPaywall: false
      }))
    }
  }

  // Show loading state
  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-orange-700">Loading...</p>
        </div>
      </div>
    )
  }

  // Show paywall for unauthorized users
  if (state.showPaywall) {
    return (
      <div className={className}>
        <Paywall 
          title={state.profile?.status === 'trial' ? "Trial Expired" : "Subscription Required"}
          message={
            state.profile?.status === 'trial' 
              ? "Your 14-day trial has ended. Upgrade to continue using Recipe Chef."
              : "A subscription is required to access this feature."
          }
          showFeatures={true}
        />
      </div>
    )
  }

  // Show trial banner if needed
  if (state.showTrialBanner && !requireAI) {
    return (
      <div className={className}>
        <TrialBanner variant="full" />
        {children}
      </div>
    )
  }

  // Show content for authorized users
  if (state.isAuthorized) {
    return (
      <div className={className}>
        {children}
      </div>
    )
  }

  // Default: redirect to sign in
  return null
}
