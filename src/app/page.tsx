'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Search, Mic, MicOff, Send, UserPlus, LogIn, ChefHat, BookOpen, Calendar, Plus, Trophy, ShoppingCart, Globe, Award, List, Link, Upload } from 'lucide-react'
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
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event: any) => {
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
              <h1 className="text-4xl md:text-5xl font-bold text-orange-900 mb-3">
                Recipe Chef
              </h1>
              <p className="text-orange-700 text-xl mb-2">
                Your Complete Culinary Companion
              </p>
              <p className="text-orange-600 text-lg">
                Discover, organize, and master recipes from around the world
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Left Column: Chef Tony */}
              <div className="flex flex-col space-y-6">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200 relative">
                  <div className="text-center">
                    <ChefOuiOui className="mx-auto" />
                    <p className="mt-4 text-orange-700 italic font-semibold">
                      "Meet Chef Tony, your personal guide to culinary excellence!"
                    </p>
                    <p className="mt-2 text-orange-600 text-sm">
                      Culinary Institute of America Graduate
                    </p>
                  </div>
                </Card>
              </div>

              {/* Right Column: Login/Auth */}
              <div className="flex flex-col">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-orange-200 h-full">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-orange-900 mb-2">
                      Start Your Culinary Journey
                    </h2>
                    <p className="text-orange-700">
                      Join Recipe Chef and unlock a world of flavors
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

                  <div className="mt-6 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200">
                    <h3 className="font-bold text-orange-900 mb-3 text-center">🎉 Everything You Need:</h3>
                    <ul className="text-sm text-orange-700 space-y-2">
                      <li className="flex items-start">
                        <Globe className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>600+ Global Recipes</strong> - Curated by a CIA graduate chef</span>
                      </li>
                      <li className="flex items-start">
                        <Link className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Import from Websites</strong> - Add recipes in seconds</span>
                      </li>
                      <li className="flex items-start">
                        <Upload className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Paprika Import</strong> - Easy migration from Paprika</span>
                      </li>
                      <li className="flex items-start">
                        <Search className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Recipe Finder</strong> - Search by ingredients you have</span>
                      </li>
                      <li className="flex items-start">
                        <Calendar className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Meal Calendar</strong> - Plan your week effortlessly</span>
                      </li>
                      <li className="flex items-start">
                        <ShoppingCart className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Auto Shopping Lists</strong> - From your meal plans</span>
                      </li>
                      <li className="flex items-start">
                        <Award className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Awards & Badges</strong> - Track your culinary journey</span>
                      </li>
                      <li className="flex items-start">
                        <BookOpen className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-orange-600" />
                        <span><strong>Personal Cookbook</strong> - Unlimited recipe storage</span>
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>
            </div>

            {/* Feature Highlights Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-orange-900 text-center mb-8">
                Powerful Features to Elevate Your Cooking
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                        <Link className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Import from Any Website</h3>
                      <p className="text-gray-700">
                        Found a great recipe online? Import it to Recipe Chef in seconds! Just paste the URL and we'll extract all the details automatically. No more copy-pasting or retyping!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Paprika Migration</h3>
                      <p className="text-gray-700">
                        Moving from Paprika? We make it simple! Import all your existing recipes with ease. Your entire collection transfers smoothly, keeping all your favorite recipes intact.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Recipe Finder</h3>
                      <p className="text-gray-700">
                        Select ingredients from your pantry and instantly discover delicious recipes you can make right now. No more "what's for dinner?" stress!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Global Cookbook by CIA Graduate</h3>
                      <p className="text-gray-700">
                        Access over 600 professionally curated recipes from every corner of the world by Culinary Institute of America graduate Chef Tony. From Italian pasta to Thai curries, explore endless culinary possibilities.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Meal Planning Made Easy</h3>
                      <p className="text-gray-700">
                        Drag and drop recipes into your weekly calendar. Automatically generate shopping lists for your planned meals. Cooking has never been this organized!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                        <ShoppingCart className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Shopping Lists</h3>
                      <p className="text-gray-700">
                        Generate comprehensive shopping lists from your meal plans. Ingredients are automatically organized by category for efficient grocery shopping.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Earn Badges & Awards</h3>
                      <p className="text-gray-700">
                        Track your culinary progress with achievements and badges. From "First Recipe" to "Master Chef," celebrate every milestone in your cooking journey!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Your Personal Cookbook</h3>
                      <p className="text-gray-700">
                        Import recipes from any website, create your own, or save favorites from our global collection. Build your perfect digital cookbook, accessible anywhere.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Ready to Transform Your Cooking?
                  </h2>
                  <p className="text-orange-100 text-lg mb-6">
                    Join thousands of home cooks discovering the joy of organized, stress-free meal planning
                  </p>
                  <Button
                    onClick={() => router.push('/auth/signup')}
                    size="lg"
                    className="bg-white text-orange-600 hover:bg-orange-50 text-lg px-8 py-6"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Start Your Free Trial Today
                  </Button>
                </CardContent>
              </Card>
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

                      {/* Earn Badges CTA */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white">
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            <Trophy className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg mb-2">Earn Badges!</h3>
                          <p className="text-orange-100 text-sm mb-3">
                            Celebrate your culinary journey with achievements
                          </p>
                          <Button
                            variant="secondary"
                            className="bg-white text-orange-600 hover:bg-orange-50"
                            onClick={() => router.push('/earn-badges')}
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            Learn How
                          </Button>
                        </div>
                      </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
