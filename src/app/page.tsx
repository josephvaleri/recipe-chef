'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Search, Mic, MicOff, Send, UserPlus, LogIn, ChefHat, BookOpen, Calendar, Plus, Trophy, ShoppingCart, Globe, Award, List, Link, Upload, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { TrialBanner } from '@/components/trial-banner'
import TopBanner from '@/components/home/TopBanner'
import UserFeedPreviewWrapper from '@/components/home/UserFeedPreviewWrapper'
import MyFeed from '@/components/community/MyFeed'
import BackgroundWrapper from '@/components/layout/background-wrapper'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [isProcessingAI, setIsProcessingAI] = useState(false)
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
        setAiQuery(transcript)
        setIsListening(false)
        // Automatically process the voice input
        handleAIQuery(transcript)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognition.start()
    }
  }

  const handleAIQuery = async (query?: string) => {
    const question = query || aiQuery.trim()
    if (!question) return

    setIsProcessingAI(true)
    setAiAnswer('')

    try {
      const response = await fetch('/api/ai/route-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process question')
      }

      // Handle different response types
      if (data.type === 'cooking_question') {
        setAiAnswer(data.answer)
      } else if (data.type === 'recipe_name_search' || data.type === 'ingredient_search') {
        // Store search data in session storage for recipe finder
        if (data.results) {
          sessionStorage.setItem('recipeNameResults', JSON.stringify(data.results))
        }
        sessionStorage.setItem('aiSearchQuery', question)
        sessionStorage.setItem('aiSearchSource', data.source)
        
        // Redirect to recipe finder
        router.push('/finder?aiSearch=true')
      } else if (data.type === 'not_food_related') {
        setAiAnswer(data.message)
      } else {
        setAiAnswer('I\'m not sure how to help with that. Please ask about recipes or cooking!')
      }
    } catch (error) {
      console.error('Error processing AI query:', error)
      setAiAnswer('Sorry, I couldn\'t process your question right now. Please try again.')
    } finally {
      setIsProcessingAI(false)
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
      <BackgroundWrapper backgroundImage="/background_home.png">
        <div>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 bg-transparent">
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
                        Select ingredients from your pantry and instantly discover delicious recipes from our global cookbook that you can make right now. No more "what's for dinner?" stress!
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
                  transition={{ delay: 0.25 }}
                >
                  <Card className="h-full bg-white/90 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">AI Recipe Writer</h3>
                      <p className="text-gray-700">
                        Ask Chef Tony what you can make with a list of ingredients and he will generate complete recipes for you to choose from and add to your cookbook or to share with a friend or group.
                      
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
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Culinary Groups</h3>
                      <p className="text-gray-700">
                        Join culinary groups to share recipes, discuss cooking techniques, create group cookbooks, share ideas and submit the best recipes to the Chef Tony's Global Cookbook.
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
                        Easily create daily meal plans and generate comprehensive shopping lists from your meal plans. Ingredients are automatically organized by category for efficient grocery shopping.
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
      </BackgroundWrapper>
    )
  }

  // Authenticated users see the full interface
  return (
    <BackgroundWrapper backgroundImage="/background_home.png">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Top Banner */}
          <TopBanner />
          
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
                  <ChefOuiOui 
                    className="mx-auto" 
                    questionBox={
                      <div className="mt-6 p-4 bg-white rounded-lg border-2 border-orange-200">
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Ask Chef Tony anything about recipes... (e.g., 'What can I make with chicken?', 'Quick pasta recipes', 'How do I make bread?')"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            className="min-h-[120px] resize-none border-orange-300 focus:border-orange-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleAIQuery()
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
                              onClick={() => handleAIQuery()}
                              disabled={!aiQuery.trim() || isProcessingAI}
                              className="bg-orange-600 hover:bg-orange-700 px-8"
                            >
                              {isProcessingAI ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Ask Chef Tony!
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </Card>

            </div>

            {/* AI Answer Display */}
            {aiAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <Card className="p-6 bg-white/90 backdrop-blur-sm border-orange-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">👨‍🍳</span>
                      <h3 className="text-lg font-semibold text-orange-900">Chef Tony's Answer</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAiAnswer('')}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                  </div>
                </Card>
              </motion.div>
            )}

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

                      {/* My Feed */}
                      <div className="mt-6">
                        <MyFeed />
                      </div>

                      {/* Earn Badges Button */}
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => router.push('/badges/learn')}
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          Learn How to Earn Badges
                        </Button>
                      </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  )
  }
