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
}

export function ChefOuiOui({ className }: ChefOuiOuiProps) {
  const [greeting, setGreeting] = useState<string>('')
  const [joke, setJoke] = useState<string>('')
  const [tip, setTip] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    loadOuiOuiLines()
  }, [])

  const loadOuiOuiLines = async () => {
    try {
      console.log('Loading Chef Tony lines...')
      
      // Load greeting
      const { data: greetingData, error: greetingError } = await supabase.rpc('get_random_ouioui_line', {
        p_type: 'greeting',
        p_locale: 'en'
      })
      console.log('Greeting data:', greetingData, 'Error:', greetingError)
      if (greetingData) setGreeting(greetingData)

      // Load joke
      const { data: jokeData, error: jokeError } = await supabase.rpc('get_random_ouioui_line', {
        p_type: 'joke',
        p_locale: 'en'
      })
      console.log('Joke data:', jokeData, 'Error:', jokeError)
      if (jokeData) setJoke(jokeData)

      // Load tip
      const { data: tipData, error: tipError } = await supabase.rpc('get_random_ouioui_line', {
        p_type: 'tip',
        p_locale: 'en'
      })
      console.log('Tip data:', tipData, 'Error:', tipError)
      if (tipData) setTip(tipData)

      setIsLoaded(true)
    } catch (error) {
      console.error('Error loading OuiOui lines:', error)
      // Fallback messages
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
      <motion.div
        className="relative"
        animate={{
          rotate: [0, 1, 0, -1, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Chef Tony Avatar */}
        <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-lg">
          <Image
            src="/chef_tony_avatar.png"
            alt="Chef Tony"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 192px, 192px"
          />
          {/* Blink Animation - Eyelid Mask */}
          <motion.div
            className="absolute inset-0 bg-black"
            animate={{
              opacity: [0, 0, 1, 1, 0, 0],
            }}
            transition={{
              duration: 0.4,
              delay: Math.random() * 3 + 7, // Random delay between 7-10 seconds
              repeat: Infinity,
              repeatDelay: Math.random() * 3 + 8, // Random repeat delay between 8-11 seconds
              ease: "easeInOut"
            }}
          />
        </div>
        
      </motion.div>

      {/* Speech Bubble */}
      {isLoaded && (
        <motion.div
          className="bg-white rounded-lg shadow-lg p-4 max-w-xs relative border-2 border-orange-200"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
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

      {/* Refresh Button */}
      <button
        onClick={refreshLines}
        className="text-xs text-orange-500 hover:text-orange-600 transition-colors"
      >
        🔄 New messages
      </button>
    </div>
  )
}
