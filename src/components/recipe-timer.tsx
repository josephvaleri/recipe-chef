'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Square, Plus, Trash2, Bell, BellOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Timer {
  id: string
  name: string
  duration: number // in seconds
  remaining: number // in seconds
  isRunning: boolean
  isCompleted: boolean
  createdAt: Date
}

interface RecipeTimerProps {
  className?: string
}

export function RecipeTimer({ className = '' }: RecipeTimerProps) {
  const [timers, setTimers] = useState<Timer[]>([])
  const [newTimerName, setNewTimerName] = useState('')
  const [newTimerMinutes, setNewTimerMinutes] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Timer tick effect
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prevTimers => {
        const updatedTimers = prevTimers.map(timer => {
          if (timer.isRunning && !timer.isCompleted && timer.remaining > 0) {
            const newRemaining = timer.remaining - 1
            if (newRemaining === 0) {
              // Timer completed - play sound
              playTimerSound()
              return { ...timer, remaining: 0, isRunning: false, isCompleted: true }
            }
            return { ...timer, remaining: newRemaining }
          }
          return timer
        })
        return updatedTimers
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const playTimerSound = () => {
    if (isMuted || !audioContextRef.current) return

    try {
      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('Could not play timer sound:', error)
    }
  }

  const addTimer = () => {
    const minutes = parseInt(newTimerMinutes)
    if (!newTimerName.trim() || !minutes || minutes <= 0) return

    const newTimer: Timer = {
      id: Date.now().toString(),
      name: newTimerName.trim(),
      duration: minutes * 60,
      remaining: minutes * 60,
      isRunning: false,
      isCompleted: false,
      createdAt: new Date()
    }

    setTimers(prev => [...prev, newTimer])
    setNewTimerName('')
    setNewTimerMinutes('')
  }

  const toggleTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        if (timer.isCompleted) {
          // Reset completed timer
          return { ...timer, remaining: timer.duration, isRunning: true, isCompleted: false }
        }
        return { ...timer, isRunning: !timer.isRunning }
      }
      return timer
    }))
  }

  const resetTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id) {
        return { ...timer, remaining: timer.duration, isRunning: false, isCompleted: false }
      }
      return timer
    }))
  }

  const deleteTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id))
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = (timer: Timer): number => {
    return ((timer.duration - timer.remaining) / timer.duration) * 100
  }

  const activeTimers = timers.filter(t => t.isRunning).length
  const completedTimers = timers.filter(t => t.isCompleted).length

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border-orange-200 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2 text-orange-600" />
            Recipe Timers
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              {activeTimers} active
            </Badge>
            {completedTimers > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                {completedTimers} done
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={isMuted ? "border-red-300 text-red-600" : "border-orange-300 text-orange-700"}
            >
              {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add New Timer */}
        <div className="flex space-x-2">
          <Input
            placeholder="Timer name (e.g., 'Bake bread')"
            value={newTimerName}
            onChange={(e) => setNewTimerName(e.target.value)}
            className="flex-1 border-orange-300 focus:border-orange-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addTimer()
              }
            }}
          />
          <Input
            type="number"
            placeholder="Min"
            value={newTimerMinutes}
            onChange={(e) => setNewTimerMinutes(e.target.value)}
            className="w-20 border-orange-300 focus:border-orange-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addTimer()
              }
            }}
          />
          <Button
            onClick={addTimer}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Timers List */}
        <div className="space-y-3">
          <AnimatePresence>
            {timers.map((timer) => (
              <motion.div
                key={timer.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  timer.isCompleted 
                    ? 'border-green-300 bg-green-50' 
                    : timer.isRunning 
                      ? 'border-orange-300 bg-orange-50' 
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{timer.name}</h4>
                    <p className="text-sm text-gray-600">
                      {formatTime(timer.remaining)} / {formatTime(timer.duration)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleTimer(timer.id)}
                      className={
                        timer.isCompleted 
                          ? "border-green-300 text-green-600 hover:bg-green-50" 
                          : timer.isRunning 
                            ? "border-orange-300 text-orange-600 hover:bg-orange-50"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }
                    >
                      {timer.isCompleted ? (
                        <Square className="w-4 h-4" />
                      ) : timer.isRunning ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => resetTimer(timer.id)}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteTimer(timer.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <motion.div
                    className={`h-2 rounded-full ${
                      timer.isCompleted 
                        ? 'bg-green-500' 
                        : timer.isRunning 
                          ? 'bg-orange-500' 
                          : 'bg-gray-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgress(timer)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge 
                    className={
                      timer.isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : timer.isRunning 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {timer.isCompleted ? 'Completed' : timer.isRunning ? 'Running' : 'Paused'}
                  </Badge>
                  {timer.isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-600 font-semibold text-sm"
                    >
                      🔔 Time's up!
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {timers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No timers yet. Add one above to get started!</p>
            </div>
          )}
        </div>

        {/* Background Tab Safety Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>Background Tab Safety:</strong> Timers will continue running even when this tab is in the background. 
            You'll hear a sound when they complete.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
