'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, DollarSign, Target, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface SettingsData {
  prices: {
    one_time: number
    monthly_ai: number
  }
  thresholds: {
    my_search: number
    global_search: number
    global_minimum: number
  }
  trial_days: number
}

export default function AdminSettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsData>({
    prices: { one_time: 9.99, monthly_ai: 0.99 },
    thresholds: { my_search: 0.50, global_search: 0.75, global_minimum: 0.50 },
    trial_days: 14
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const currentProfile = await getCurrentProfile()
      
      if (!currentUser || !currentProfile) {
        router.push('/auth/signin')
        return
      }

      if (!isAdmin(currentProfile)) {
        router.push('/')
        return
      }

      setUser(currentUser)
      setProfile(currentProfile)
      
      // Load current settings
      await loadSettings()
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/auth/signin')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')

      if (error) throw error

      // Parse settings data
      const settingsData: Partial<SettingsData> = {}
      data?.forEach(setting => {
        if (setting.key === 'prices') {
          settingsData.prices = setting.value
        } else if (setting.key === 'thresholds') {
          settingsData.thresholds = setting.value
        } else if (setting.key === 'trial_days') {
          settingsData.trial_days = setting.value
        }
      })

      setSettings(prev => ({ ...prev, ...settingsData }))
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      // Update prices
      const { error: pricesError } = await supabase
        .from('settings')
        .upsert({
          key: 'prices',
          value: settings.prices,
          updated_at: new Date().toISOString()
        })

      if (pricesError) throw pricesError

      // Update thresholds
      const { error: thresholdsError } = await supabase
        .from('settings')
        .upsert({
          key: 'thresholds',
          value: settings.thresholds,
          updated_at: new Date().toISOString()
        })

      if (thresholdsError) throw thresholdsError

      // Update trial days
      const { error: trialError } = await supabase
        .from('settings')
        .upsert({
          key: 'trial_days',
          value: settings.trial_days,
          updated_at: new Date().toISOString()
        })

      if (trialError) throw trialError

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setIsSaving(false)
    }
  }

  const updatePrices = (field: keyof SettingsData['prices'], value: number) => {
    setSettings(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [field]: value
      }
    }))
  }

  const updateThresholds = (field: keyof SettingsData['thresholds'], value: number) => {
    setSettings(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [field]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-orange-700">Loading admin settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-2"
            >
              ← Back to Admin
            </Button>
            <div className="flex items-center space-x-2">
              <Settings className="w-8 h-8 text-orange-600" />
              <h1 className="text-3xl font-bold text-orange-900">Admin Settings</h1>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Settings Cards */}
          <div className="space-y-6">
            {/* Pricing Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <span>Pricing Configuration</span>
                </CardTitle>
                <CardDescription>
                  Set the pricing for one-time purchases and monthly AI subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      One-Time Purchase Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={settings.prices.one_time}
                        onChange={(e) => updatePrices('one_time', parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Monthly AI Subscription (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={settings.prices.monthly_ai}
                        onChange={(e) => updatePrices('monthly_ai', parseFloat(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <span>Search Thresholds</span>
                </CardTitle>
                <CardDescription>
                  Configure the minimum similarity scores for recipe matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      My Cookbook Search
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.thresholds.my_search}
                      onChange={(e) => updateThresholds('my_search', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-orange-600 mt-1">Threshold for personal recipe search</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Global Search
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.thresholds.global_search}
                      onChange={(e) => updateThresholds('global_search', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-orange-600 mt-1">Threshold for global recipe search</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Global Minimum
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.thresholds.global_minimum}
                      onChange={(e) => updateThresholds('global_minimum', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-orange-600 mt-1">Minimum threshold for global results</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trial Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span>Trial Configuration</span>
                </CardTitle>
                <CardDescription>
                  Set the duration of the free trial period for new users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-orange-900 mb-2">
                    Trial Duration (Days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.trial_days}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      trial_days: parseInt(e.target.value) || 14
                    }))}
                    className="w-32"
                  />
                  <p className="text-xs text-orange-600 mt-1">Number of days for the free trial</p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={saveSettings}
                disabled={isSaving}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
