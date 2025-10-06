'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChefHat } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/signin?error=auth_error')
          return
        }

        if (data.session) {
          // User is authenticated, redirect to home
          router.push('/')
        } else {
          // No session, redirect to sign in
          router.push('/auth/signin')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        router.push('/auth/signin?error=auth_error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ChefHat className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Sign In...</h2>
        <p className="text-gray-600">Please wait while we set up your account.</p>
      </div>
    </div>
  )
}
