'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface OuiOuiLine {
  type: 'greeting' | 'joke' | 'tip'
  text: string
  locale: string
}

interface ChefOuiOuiProps {
  className?: string
  questionBox?: React.ReactNode
}

export function ChefOuiOui({ className, questionBox }: ChefOuiOuiProps) {
  const [greeting, setGreeting] = useState<string>('')
  const [joke, setJoke] = useState<string>('')
  const [tip, setTip] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load static content immediately for fast LCP
    setIsLoaded(true)
    
    // Load dynamic content after initial render
    const timer = setTimeout(() => {
      loadOuiOuiLines()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const loadOuiOuiLines = async () => {
    try {
      console.log('Loading Chef Tony lines...')
      
      // Load static content immediately for fast display
      const greetings = [
        "Buon Giorno! Welcome to Recipe Chef!",
        "Salute! Ready to cook something amazing?",
        "Buona Sera! Time to discover new flavors!",
        "Benvenuto! Let's make magic in the kitchen!",
        "Ciao amici! What shall we cook today?",
        "Buon appetito! Welcome to your culinary journey!"
      ]
      
      const jokes = [
        "Why don't eggs tell jokes? They'd crack each other up!",
        "What do you call a fake noodle? An impasta!",
        "Why did the chef break up with the refrigerator? It was too cold!",
        "What's a chef's favorite type of music? Heavy metal!",
        "Why don't chefs ever get lonely? Because they always have their whisk!",
        "What do you call a chef who's also a magician? A saucery!"
      ]
      
      const tips = [
        "Always taste your food while cooking - your palate is your best guide!",
        "Keep your knives sharp - a dull knife is more dangerous than a sharp one!",
        "Mise en place - prepare all ingredients before you start cooking!",
        "Don't be afraid to experiment with flavors - cooking is an art!",
        "Clean as you go - it makes cooking much more enjoyable!",
        "Trust your instincts - if it smells good, it probably tastes good too!"
      ]
      
      // Set static content immediately for fast loading
      setGreeting(greetings[Math.floor(Math.random() * greetings.length)])
      setJoke(jokes[Math.floor(Math.random() * jokes.length)])
      setTip(tips[Math.floor(Math.random() * tips.length)])
      setIsLoaded(true)
      
      console.log('Chef Tony lines loaded instantly with static content!')
      
      // Try to load from database in the background (non-blocking)
      setTimeout(async () => {
        try {
          const [greetingResult, jokeResult, tipResult] = await Promise.allSettled([
            supabase.rpc('get_random_ouioui_line', { p_line_type: 'greeting', p_locale: 'en' }),
            supabase.rpc('get_random_ouioui_line', { p_line_type: 'joke', p_locale: 'en' }),
            supabase.rpc('get_random_ouioui_line', { p_line_type: 'tip', p_locale: 'en' })
          ])

          // Update with database content if successful
          if (greetingResult.status === 'fulfilled' && greetingResult.value.data) {
            console.log('Updating greeting from database:', greetingResult.value.data)
            setGreeting(greetingResult.value.data)
          }
          
          if (jokeResult.status === 'fulfilled' && jokeResult.value.data) {
            console.log('Updating joke from database:', jokeResult.value.data)
            setJoke(jokeResult.value.data)
          }
          
          if (tipResult.status === 'fulfilled' && tipResult.value.data) {
            console.log('Updating tip from database:', tipResult.value.data)
            setTip(tipResult.value.data)
          }
          
        } catch (dbError) {
          console.log('Background database load failed, keeping static content:', dbError)
        }
      }, 100) // Small delay to let the UI render first
      
    } catch (error) {
      console.error('Error loading OuiOui lines:', error)
      // Final fallback messages
      setGreeting("Bonjour! Welcome to Recipe Chef!")
      setJoke("Why don't eggs tell jokes? They'd crack each other up!")
      setTip("Always taste your food while cooking - your palate is your best guide!")
      setIsLoaded(true)
    }
  }

  const refreshLines = () => {
    loadOuiOuiLines()
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Chef Avatar */}
      <div className="relative">
        {/* Chef Tony Avatar */}
        <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-lg bg-gray-100">
          <Image
            src="/chef_tony_avatar.png"
            alt="Chef Tony"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 192px, 192px"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </div>
        
      </div>

      {/* Speech Bubble - Reserve space to prevent CLS */}
      <motion.div
        className="bg-white rounded-lg shadow-lg p-4 max-w-xs relative border-2 border-orange-200 min-h-[80px]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0.8 }}
        transition={{ delay: 0.5 }}
      >
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-orange-200" />
          
          <div className="space-y-2">
            {greeting && (
              <p className="text-sm text-gray-700 font-medium">
                <span className="text-orange-600">💬</span> {greeting}
              </p>
            )}
            {joke && (
              <p className="text-sm text-gray-600">
                <span className="text-orange-500">😄</span> {joke}
              </p>
            )}
          </div>
        </motion.div>

      {/* Question Box - positioned above Chef's Tip */}
      {questionBox && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {questionBox}
        </motion.div>
      )}

      {/* Tip of the Day */}
      {tip && (
        <motion.div
          className="bg-orange-50 border border-orange-200 rounded-lg p-3 max-w-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-start space-x-2">
            <span className="text-orange-500 text-lg">💡</span>
            <div>
              <p className="text-xs font-semibold text-orange-700 mb-1">Chef's Tip</p>
              <p className="text-sm text-gray-700">{tip}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Meet Chef Tony Link */}
      <a
        href="/about-chef-tony"
        className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-semibold"
      >
        👨‍🍳 Meet Chef Tony!
      </a>
    </div>
  )
}
