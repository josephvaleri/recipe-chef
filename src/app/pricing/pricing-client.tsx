'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function PricingPageClient() {
  const router = useRouter()
  
  return (
    <Button variant="ghost" size="sm" onClick={() => router.back()}>
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  )
}

