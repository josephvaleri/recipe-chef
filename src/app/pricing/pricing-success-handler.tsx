'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function PricingSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [hasShownSuccess, setHasShownSuccess] = useState(false)
  const success = searchParams.get('success')
  
  useEffect(() => {
    if (success === 'true' && !hasShownSuccess) {
      setHasShownSuccess(true)
      
      // Show success message using sonner toast
      toast.success('🎉 Payment successful! Welcome to Recipe Chef Pro!', {
        description: 'Your subscription is now active. Enjoy all premium features!',
        duration: 5000,
      })
      
      // Clean up URL parameter without reloading
      // This removes ?success=true from the URL while staying on the page
      const newUrl = window.location.pathname
      router.replace(newUrl)
      
      // Refresh the page after a short delay to show updated subscription status
      // The webhook should have already updated the profile
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }, [success, hasShownSuccess, router])
  
  return null
}

