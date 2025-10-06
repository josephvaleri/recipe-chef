'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Crown, Clock, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TrialBannerProps {
  variant?: 'full' | 'compact'
  className?: string
}

export function TrialBanner({ variant = 'full', className = '' }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const router = useRouter()

  if (!isVisible) return null

  const handleStartTrial = () => {
    router.push('/auth/signup')
  }

  if (variant === 'compact') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-gradient-to-r from-orange-500 to-orange-600 text-white ${className}`}
          >
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Start your 14-day free trial
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={handleStartTrial}
                    className="bg-white text-orange-600 hover:bg-orange-50 text-xs px-3 py-1"
                  >
                    Get Started
                  </Button>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="text-orange-100 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${className}`}
        >
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-xl">
            <CardContent className="p-6 text-white relative">
              {/* Close button */}
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 text-orange-100 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Start Your Free Trial!</h3>
                  <p className="text-orange-100 text-sm">
                    Full access to all features
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center space-x-2 text-orange-100">
                  <div className="w-2 h-2 bg-orange-200 rounded-full" />
                  <span className="text-sm">Import recipes from any website</span>
                </div>
                <div className="flex items-center space-x-2 text-orange-100">
                  <div className="w-2 h-2 bg-orange-200 rounded-full" />
                  <span className="text-sm">AI-powered recipe search</span>
                </div>
                <div className="flex items-center space-x-2 text-orange-100">
                  <div className="w-2 h-2 bg-orange-200 rounded-full" />
                  <span className="text-sm">Smart meal planning & shopping lists</span>
                </div>
                <div className="flex items-center space-x-2 text-orange-100">
                  <div className="w-2 h-2 bg-orange-200 rounded-full" />
                  <span className="text-sm">Recipe timers & scaling</span>
                </div>
              </div>

              {/* Trial info */}
              <div className="flex items-center space-x-2 mb-4 p-3 bg-white/10 rounded-lg">
                <Clock className="w-4 h-4 text-orange-200" />
                <span className="text-sm font-medium">14 days free • No credit card required</span>
              </div>

              {/* CTA Button */}
              <Button
                onClick={handleStartTrial}
                className="w-full bg-white text-orange-600 hover:bg-orange-50 font-semibold py-3"
                size="lg"
              >
                Start Free Trial
              </Button>

              {/* Fine print */}
              <p className="text-xs text-orange-200 text-center mt-3">
                Cancel anytime. No hidden fees.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
