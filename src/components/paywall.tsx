'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, Lock, Sparkles, Clock, ChefHat } from 'lucide-react'
import { motion } from 'framer-motion'

interface PaywallProps {
  title?: string
  message?: string
  showFeatures?: boolean
  className?: string
}

export function Paywall({ 
  title = "Upgrade Required",
  message = "Your trial has ended. Upgrade to continue using Recipe Chef.",
  showFeatures = true,
  className = ""
}: PaywallProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push('/pricing')
  }

  const features = [
    {
      icon: ChefHat,
      title: "AI-Powered Search",
      description: "Find recipes using natural language"
    },
    {
      icon: Clock,
      title: "Recipe Timers",
      description: "Multiple timers for complex recipes"
    },
    {
      icon: Sparkles,
      title: "Smart Import",
      description: "Import from any recipe website"
    },
    {
      icon: Crown,
      title: "Premium Features",
      description: "Advanced meal planning & analytics"
    }
  ]

  return (
    <div className={`flex items-center justify-center min-h-[400px] p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <Card className="bg-white/90 backdrop-blur-sm border-orange-200 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-orange-900">{title}</CardTitle>
            <CardDescription className="text-orange-700">
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {showFeatures && (
              <div className="space-y-4">
                <h3 className="font-semibold text-orange-900 text-center">
                  What you'll get with premium:
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {features.map((feature, index) => {
                    const Icon = feature.icon
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Icon className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-orange-900 text-sm">
                            {feature.title}
                          </h4>
                          <p className="text-orange-600 text-xs">
                            {feature.description}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Upgrade Button */}
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3"
              size="lg"
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade Now
            </Button>

            {/* Alternative actions */}
            <div className="text-center space-y-2">
              <p className="text-sm text-orange-600">
                Already have an account?
              </p>
              <Button
                variant="outline"
                onClick={() => router.push('/auth/signin')}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
