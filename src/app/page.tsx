'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Search, Mic, MicOff, Send, UserPlus, LogIn, ChefHat, BookOpen, Calendar, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { TrialBanner } from '@/components/trial-banner'
import { RouteGuard } from '@/components/route-guard'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [user, setUser] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setSearchQuery(transcript)
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognition.start()
    }
  }

  const quickActions = [
    {
      title: 'My Cookbook',
      description: 'View your personal recipe collection',
      icon: BookOpen,
      href: '/cookbook',
      color: 'bg-blue-500'
    },
    {
      title: 'Recipe Finder',
      description: 'Find recipes by ingredients',
      icon: Search,
      href: '/finder',
      color: 'bg-green-500'
    },
    {
      title: 'Menu Calendar',
      description: 'Plan your meals',
      icon: Calendar,
      href: '/calendar',
      color: 'bg-purple-500'
    },
    {
      title: 'Add Recipe',
      description: 'Import or create new recipes',
      icon: Plus,
      href: '/add',
      color: 'bg-orange-500'
    }
  ]

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <p className="text-orange-700">Loading Recipe Chef...</p>
          </div>
        </div>
      </div>
    )
  }

  // Non-authenticated users see Chef Tony on left, login on right
  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <TrialBanner variant="compact" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-orange-900 mb-2">
                Recipe Chef
              </h1>
              <p className="text-orange-700 text-lg">
                Your personal cooking assistant, ready to help with any recipe
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Chef Tony */}
              <div className="flex flex-col space-y-6">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200 relative">
                  <div className="text-center">
                    <ChefOuiOui className="mx-auto" />
                  </div>
                </Card>
              </div>

              {/* Right Column: Login/Auth */}
              <div className="flex flex-col">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200 h-full">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-orange-900 mb-2">
                      Get Started with Recipe Chef
                    </h2>
                    <p className="text-orange-700">
                      Sign up for your free trial and start organizing your recipes
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={() => router.push('/auth/signup')}
                      className="w-full bg-orange-600 hover:bg-orange-700 py-3"
                      size="lg"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Start Free Trial
                    </Button>

                    <Button
                      onClick={() => router.push('/auth/signin')}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 py-3"
                      size="lg"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">What you get:</h3>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Unlimited recipe storage</li>
                      <li>• AI-powered recipe search</li>
                      <li>• Meal planning calendar</li>
                      <li>• Shopping list generation</li>
                    </ul>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated users see the full interface
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-900 mb-2">
              Recipe Chef
            </h1>
            <p className="text-orange-700 text-lg">
              Your personal cooking assistant, ready to help with any recipe
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Chef Tony and Search */}
            <div className="flex flex-col space-y-6">
              {/* Chef Tony Avatar Card */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200 relative">
                <div className="text-center">
                  <ChefOuiOui className="mx-auto" />
                </div>
              </Card>

              {/* Search Input Card */}
              <RouteGuard requireAuth={true} requireAI={true}>
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Ask Chef Tony anything about recipes... (e.g., 'What can I make with chicken?', 'Quick pasta recipes', 'How do I make bread?')"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      className="min-h-[120px] resize-none border-orange-300 focus:border-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          // Handle AI query submission
                        }
                      }}
                    />
                    
                    <div className="flex justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleVoiceSearch}
                        className={isListening ? 'bg-red-100 text-red-600' : ''}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button
                        disabled={!aiQuery.trim()}
                        className="bg-orange-600 hover:bg-orange-700 px-8"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Ask Chef Tony!
                      </Button>
                    </div>
                  </div>
                </Card>
              </RouteGuard>
            </div>

            {/* Right Column: Quick Actions */}
            <div className="flex flex-col">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200 h-full">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-orange-900 mb-4">Quick Actions</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <motion.div
                          key={action.title}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card 
                            className="hover:shadow-md transition-shadow cursor-pointer border-orange-200"
                            onClick={() => router.push(action.href)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                                  <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-orange-900">{action.title}</h3>
                                  <p className="text-sm text-orange-600">{action.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>

                      {/* Trial Banner */}
                      <RouteGuard requireAuth={true} requireAI={false} showTrialBanner={true}>
                        <div className="mt-6 p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg text-white">
                          <div className="text-center">
                            <h3 className="font-bold text-lg mb-2">Upgrade to Premium</h3>
                            <p className="text-orange-100 text-sm mb-3">
                              Get AI-powered recipe search and advanced meal planning
                            </p>
                            <Button
                              variant="secondary"
                              className="bg-white text-orange-600 hover:bg-orange-50"
                              onClick={() => router.push('/pricing')}
                            >
                              View Pricing
                            </Button>
                          </div>
                        </div>
                      </RouteGuard>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
