'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { 
  User, 
  Mail, 
  CreditCard, 
  MapPin, 
  Globe, 
  Utensils,
  AlertTriangle,
  Flame,
  ChefHat,
  Clock,
  Users,
  Loader2,
  Save,
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  Map,
  Bot
} from 'lucide-react'
import GPTAuthHelper from '@/components/GPTAuthHelper'
import { toast } from 'sonner'
import BackgroundWrapper from '@/components/layout/background-wrapper'

interface UserProfile {
  user_id: string
  full_name?: string
  display_name?: string
  bio?: string
  profile_photo_url?: string
  email?: string
  location?: string
  timezone?: string
  preferred_units?: 'us' | 'metric'
  interface_language?: string
  
  // Community fields
  avatar_url?: string
  avatar_choice?: string
  house_specialties?: number[]
  user_tag?: string
  instagram_handle?: string
  youtube_url?: string
  is_verified_chef?: boolean
  
  // Diet & Constraints
  diet_type?: string
  allergens?: Array<{allergen: string, severity: string}>
  disliked_ingredients?: string[]
  
  // Taste & Style
  spice_tolerance?: number
  taste_preferences?: {
    sweet?: number
    sour?: number
    salty?: number
    bitter?: number
    umami?: number
    richness?: number
  }
  texture_preferences?: string[]
  cuisine_affinities?: {[key: string]: number}
  
  // Cooking Context
  skill_level?: string
  typical_time_cap?: number
  household_adults?: number
  household_kids?: number
  default_servings?: number
  
  // Equipment
  available_equipment?: string[]
  
  // Privacy
  privacy_public_profile?: boolean
  privacy_share_collections?: boolean
  privacy_anonymous_reviews?: boolean
  
  // Community Privacy (Phase 2)
  visibility?: 'NO_VISIBILITY' | 'FRIENDS_ONLY' | 'FRIENDS_AND_FOLLOWERS' | 'ANYONE'
  geo_opt_in?: boolean
  lat?: number
  lng?: number
  diet?: string
  favorite_cuisine?: string
  
  // Subscription
  subscription_status?: string
}

const COMMON_ALLERGENS = [
  'Peanuts', 'Tree Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat/Gluten',
  'Shellfish', 'Fish', 'Sesame', 'Corn', 'Sulfites'
]

const COMMON_EQUIPMENT = [
  'Oven', 'Microwave', 'Air Fryer', 'Instant Pot', 'Slow Cooker',
  'Sous Vide', 'Blender', 'Food Processor', 'Stand Mixer',
  'Wok', 'Cast Iron Skillet', 'Grill', 'Smoker', 'Dehydrator'
]

const TEXTURE_OPTIONS = [
  'Crunchy', 'Creamy', 'Smooth', 'Chunky', 'Brothy', 'Thick',
  'Crispy', 'Tender', 'Chewy', 'Fluffy', 'Dense'
]

const CUISINES = [
  'Italian', 'Chinese', 'Mexican', 'Thai', 'Indian', 'Japanese',
  'French', 'Greek', 'Spanish', 'Korean', 'Vietnamese', 'Ethiopian',
  'Middle Eastern', 'Mediterranean', 'American', 'Cajun/Creole'
]

function getVisibilityExplanation(visibility: string): string {
  switch (visibility) {
    case 'NO_VISIBILITY':
      return 'Your profile and content are completely private. Only you can see your information.'
    case 'FRIENDS_ONLY':
      return 'Only your friends can see your profile and content. Others will see you as "Anonymous".'
    case 'FRIENDS_AND_FOLLOWERS':
      return 'Your friends and followers can see your profile and content. Others will see you as "Anonymous".'
    case 'ANYONE':
      return 'Anyone can see your profile and content. This is the most open setting.'
    default:
      return 'Privacy setting not recognized.'
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('identity')
  const [retryCount, setRetryCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const loadingRef = useRef(false)
  const componentId = useRef(`ProfilePage-${Math.random().toString(36).substr(2, 9)}`)

  // Debug logging
  console.log(`[${componentId.current}] ProfilePage render - mounted: ${mounted}, loading: ${loading}, profile: ${!!profile}`)

  useEffect(() => {
    console.log(`[${componentId.current}] useEffect INITIALIZE - starting component initialization`)
    let isMounted = true
    let initTimeoutId: NodeJS.Timeout | null = null

    const initializeComponent = async () => {
      console.log(`[${componentId.current}] initializeComponent called - isMounted: ${isMounted}`)
      if (!isMounted) return
      
      console.log(`[${componentId.current}] Setting mounted to true`)
      setMounted(true)
      
      // Add a small delay to prevent race conditions with other components
      initTimeoutId = setTimeout(async () => {
        console.log(`[${componentId.current}] Init timeout triggered - isMounted: ${isMounted}`)
        if (isMounted) {
          console.log(`[${componentId.current}] Calling loadProfile from init timeout`)
          await loadProfile()
        } else {
          console.log(`[${componentId.current}] Component unmounted, skipping loadProfile`)
        }
      }, 100)
    }

    // Initialize component
    console.log(`[${componentId.current}] Calling initializeComponent`)
    initializeComponent()

    // Cleanup function
    return () => {
      console.log(`[${componentId.current}] useEffect CLEANUP - component unmounting`)
      isMounted = false
      
      if (initTimeoutId) {
        console.log(`[${componentId.current}] Clearing init timeout`)
        clearTimeout(initTimeoutId)
      }
      
      // Reset loading state
      console.log(`[${componentId.current}] Resetting loading state`)
      loadingRef.current = false
      setLoading(false)
    }
  }, []) // Empty dependency array to prevent re-initialization

  const loadProfile = async (isRetry = false) => {
    console.log(`[${componentId.current}] loadProfile called - isRetry: ${isRetry}, loadingRef.current: ${loadingRef.current}`)
    
    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      console.log(`[${componentId.current}] Profile already loading, skipping...`)
      return
    }

    console.log(`[${componentId.current}] Starting profile load - setting loading states`)
    loadingRef.current = true
    setLoading(true)
    
    try {
      console.log(`[${componentId.current}] Loading profile...`, isRetry ? '(retry)' : '')
      
      console.log(`[${componentId.current}] Calling getCurrentUser()`)
      const user = await getCurrentUser()
      if (!user) {
        console.log(`[${componentId.current}] No user found, redirecting to signin`)
        router.push('/auth/signin')
        return
      }

      console.log(`[${componentId.current}] User found:`, user.id)
      console.log(`[${componentId.current}] Querying profiles table`)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error(`[${componentId.current}] Error loading profile:`, error)
        throw error
      }

      console.log(`[${componentId.current}] Profile loaded successfully:`, data?.user_id)
      
      console.log(`[${componentId.current}] Setting profile state`)
      setProfile(data || {
        user_id: user.id,
        allergens: [],
        disliked_ingredients: [],
        taste_preferences: { sweet: 3, sour: 3, salty: 3, bitter: 3, umami: 3, richness: 3 },
        texture_preferences: [],
        cuisine_affinities: {},
        available_equipment: [],
        privacy_public_profile: false,
        privacy_share_collections: false,
        privacy_anonymous_reviews: true
      })
      setRetryCount(0) // Reset retry count on success
      console.log(`[${componentId.current}] Profile load completed successfully`)
    } catch (error) {
      console.error(`[${componentId.current}] Error in loadProfile:`, error)
      if (isRetry) {
        toast.error('Failed to load profile. Please try again.')
      } else {
        toast.error('Failed to load profile')
      }
      setRetryCount(prev => prev + 1)
    } finally {
      console.log(`[${componentId.current}] Setting loading to false`)
      loadingRef.current = false
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('user_id', profile.user_id)

      if (error) {
        console.error('Error saving profile:', error)
        toast.error('Failed to save profile')
        return
      }

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updateNestedField = (parent: string, field: string, value: any) => {
    setProfile(prev => {
      if (!prev) return null
      return {
        ...prev,
        [parent]: {
          ...(prev[parent as keyof UserProfile] as any),
          [field]: value
        }
      }
    })
  }

  const toggleArrayItem = (field: string, item: string) => {
    setProfile(prev => {
      if (!prev) return null
      const array = (prev[field as keyof UserProfile] as string[]) || []
      const newArray = array.includes(item)
        ? array.filter(i => i !== item)
        : [...array, item]
      return { ...prev, [field]: newArray }
    })
  }

  const addAllergen = (allergen: string, severity: string) => {
    setProfile(prev => {
      if (!prev) return null
      const allergens = prev.allergens || []
      // Remove if exists and re-add with new severity
      const filtered = allergens.filter(a => a.allergen !== allergen)
      return {
        ...prev,
        allergens: [...filtered, { allergen, severity }]
      }
    })
  }

  const removeAllergen = (allergen: string) => {
    setProfile(prev => {
      if (!prev) return null
      return {
        ...prev,
        allergens: (prev.allergens || []).filter(a => a.allergen !== allergen)
      }
    })
  }

  // Prevent hydration mismatch by showing consistent loading state
  if (!mounted) {
    return (
      <BackgroundWrapper backgroundImage="/background_12.png">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-orange-700 mb-4">Loading your profile...</p>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  if (loading) {
    return (
      <BackgroundWrapper backgroundImage="/background_12.png">
        <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-orange-700 mb-4">Loading your profile...</p>
          {retryCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-orange-600">Having trouble loading? Try again.</p>
              <Button 
                onClick={() => loadProfile(true)} 
                variant="outline" 
                size="sm"
                disabled={loadingRef.current}
              >
                Retry
              </Button>
            </div>
          )}
        </div>
        </div>
      </BackgroundWrapper>
    )
  }

  if (!profile) return null

  return (
    <BackgroundWrapper backgroundImage="/background_12.png">
      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-orange-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                </div>
              </div>
              
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="diet">Diet</TabsTrigger>
              <TabsTrigger value="taste">Taste</TabsTrigger>
              <TabsTrigger value="cooking">Cooking</TabsTrigger>
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="gpt">GPT</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            {/* Identity & Basics */}
            <TabsContent value="identity" className="space-y-6 bg-white/10 rounded-lg p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-orange-500" />
                    <span>Identity & Basics</span>
                  </CardTitle>
                  <CardDescription>
                    Your personal information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={profile.display_name || ''}
                        onChange={(e) => updateField('display_name', e.target.value)}
                        placeholder="How should we address you?"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="location"
                          value={profile.location || ''}
                          onChange={(e) => updateField('location', e.target.value)}
                          placeholder="City, State or ZIP"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio || ''}
                      onChange={(e) => updateField('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <select
                        id="timezone"
                        value={profile.timezone || 'America/New_York'}
                        onChange={(e) => updateField('timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="America/New_York">Eastern (ET)</option>
                        <option value="America/Chicago">Central (CT)</option>
                        <option value="America/Denver">Mountain (MT)</option>
                        <option value="America/Los_Angeles">Pacific (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="preferred_units">Preferred Units</Label>
                      <select
                        id="preferred_units"
                        value={profile.preferred_units || 'us'}
                        onChange={(e) => updateField('preferred_units', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="us">US (cups, pounds, °F)</option>
                        <option value="metric">Metric (ml, grams, °C)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="profile_photo_url">Profile Photo URL</Label>
                    <Input
                      id="profile_photo_url"
                      value={profile.profile_photo_url || ''}
                      onChange={(e) => updateField('profile_photo_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Community Fields */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Profile</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="user_tag">User Tag</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">@</span>
                          <Input
                            id="user_tag"
                            value={profile.user_tag?.replace('@', '') || ''}
                            onChange={(e) => updateField('user_tag', e.target.value ? `@${e.target.value}` : '')}
                            placeholder="yourusername"
                            className="pl-8"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Your unique community handle (will be prefixed with @)
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="avatar_choice">Avatar Choice</Label>
                        <select
                          id="avatar_choice"
                          value={profile.avatar_choice || ''}
                          onChange={(e) => updateField('avatar_choice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select an avatar</option>
                          <option value="chef-hat">Chef Hat</option>
                          <option value="cooking-pot">Cooking Pot</option>
                          <option value="whisk">Whisk</option>
                          <option value="knife">Chef Knife</option>
                          <option value="spatula">Spatula</option>
                          <option value="custom">Custom Upload</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label htmlFor="instagram_handle">Instagram Handle</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">@</span>
                          <Input
                            id="instagram_handle"
                            value={profile.instagram_handle || ''}
                            onChange={(e) => updateField('instagram_handle', e.target.value)}
                            placeholder="yourusername"
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="youtube_url">YouTube Channel URL</Label>
                        <Input
                          id="youtube_url"
                          value={profile.youtube_url || ''}
                          onChange={(e) => updateField('youtube_url', e.target.value)}
                          placeholder="https://youtube.com/@yourchannel"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>House Specialties</Label>
                      <p className="text-sm text-gray-500 mb-2">
                        Select up to 3 of your best recipes to showcase (coming soon)
                      </p>
                      <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-sm text-gray-500 text-center">
                          Recipe selection will be available after you create some recipes
                        </p>
                      </div>
                    </div>

                    {profile.is_verified_chef && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <span className="text-green-800 font-medium">Verified Chef</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Your chef credentials have been verified by our team
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Diet & Constraints */}
            <TabsContent value="diet" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Utensils className="w-5 h-5 text-orange-500" />
                    <span>Diet & Constraints</span>
                  </CardTitle>
                  <CardDescription>
                    Dietary preferences, allergies, and ingredients you avoid
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="diet_type">Diet Type</Label>
                    <select
                      id="diet_type"
                      value={profile.diet_type || 'omnivore'}
                      onChange={(e) => updateField('diet_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="omnivore">Omnivore</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="pescatarian">Pescatarian</option>
                      <option value="keto">Keto</option>
                      <option value="paleo">Paleo</option>
                      <option value="halal">Halal</option>
                      <option value="kosher">Kosher</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label>Allergens</Label>
                    <div className="space-y-2 mt-2">
                      {COMMON_ALLERGENS.map(allergen => {
                        const existing = (profile.allergens || []).find(a => a.allergen === allergen)
                        return (
                          <div key={allergen} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <input
                              type="checkbox"
                              checked={!!existing}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  addAllergen(allergen, 'moderate')
                                } else {
                                  removeAllergen(allergen)
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="flex-1">{allergen}</span>
                            {existing && (
                              <select
                                value={existing.severity}
                                onChange={(e) => addAllergen(allergen, e.target.value)}
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                              >
                                <option value="mild">Mild</option>
                                <option value="moderate">Moderate</option>
                                <option value="severe">Severe</option>
                              </select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="disliked">Ingredients You Dislike</Label>
                    <Input
                      id="disliked"
                      placeholder="e.g., cilantro, olives, anchovies (comma separated)"
                      value={(profile.disliked_ingredients || []).join(', ')}
                      onChange={(e) => updateField('disliked_ingredients', 
                        e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      )}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Recipes with these ingredients will be flagged or filtered
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Taste & Style */}
            <TabsContent value="taste" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span>Taste & Style Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Help us understand your flavor preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Spice Tolerance: {profile.spice_tolerance || 3}/5</Label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={profile.spice_tolerance || 3}
                      onChange={(e) => updateField('spice_tolerance', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>None</span>
                      <span>Mild</span>
                      <span>Medium</span>
                      <span>Hot</span>
                      <span>Very Hot</span>
                      <span>Extreme</span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Flavor Preferences (0-5)</Label>
                    <div className="space-y-3">
                      {['sweet', 'sour', 'salty', 'bitter', 'umami', 'richness'].map(taste => (
                        <div key={taste}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="capitalize text-sm">{taste}</span>
                            <span className="text-sm font-medium">
                              {profile.taste_preferences?.[taste as keyof typeof profile.taste_preferences] || 3}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={profile.taste_preferences?.[taste as keyof typeof profile.taste_preferences] || 3}
                            onChange={(e) => updateNestedField('taste_preferences', taste, parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Preferred Textures</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {TEXTURE_OPTIONS.map(texture => (
                        <button
                          key={texture}
                          onClick={() => toggleArrayItem('texture_preferences', texture)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            (profile.texture_preferences || []).includes(texture)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {texture}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Cuisine Affinities (0-5)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CUISINES.map(cuisine => (
                        <div key={cuisine} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{cuisine}</span>
                          <div className="flex items-center space-x-2">
                            {[0, 1, 2, 3, 4, 5].map(rating => (
                              <button
                                key={rating}
                                onClick={() => updateNestedField('cuisine_affinities', cuisine, rating)}
                                className={`w-6 h-6 rounded-full text-xs ${
                                  (profile.cuisine_affinities?.[cuisine] || 0) >= rating
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                }`}
                              >
                                {rating}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cooking Context */}
            <TabsContent value="cooking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ChefHat className="w-5 h-5 text-orange-500" />
                    <span>Cooking Context</span>
                  </CardTitle>
                  <CardDescription>
                    Your cooking experience and household details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="skill_level">Skill Level</Label>
                    <select
                      id="skill_level"
                      value={profile.skill_level || 'home_cook'}
                      onChange={(e) => updateField('skill_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="home_cook">Home Cook</option>
                      <option value="advanced">Advanced</option>
                      <option value="professional">Professional</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="typical_time_cap">
                      Weeknight Time Cap (minutes): {profile.typical_time_cap || 45}
                    </Label>
                    <input
                      id="typical_time_cap"
                      type="range"
                      min="15"
                      max="120"
                      step="15"
                      value={profile.typical_time_cap || 45}
                      onChange={(e) => updateField('typical_time_cap', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>15 min</span>
                      <span>45 min</span>
                      <span>90 min</span>
                      <span>2 hrs</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="household_adults">
                        <Users className="w-4 h-4 inline mr-1" />
                        Adults
                      </Label>
                      <Input
                        id="household_adults"
                        type="number"
                        min="1"
                        value={profile.household_adults || 2}
                        onChange={(e) => updateField('household_adults', parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="household_kids">
                        <Users className="w-4 h-4 inline mr-1" />
                        Kids
                      </Label>
                      <Input
                        id="household_kids"
                        type="number"
                        min="0"
                        value={profile.household_kids || 0}
                        onChange={(e) => updateField('household_kids', parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="default_servings">Default Servings</Label>
                      <Input
                        id="default_servings"
                        type="number"
                        min="1"
                        value={profile.default_servings || 4}
                        onChange={(e) => updateField('default_servings', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Equipment */}
            <TabsContent value="equipment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Equipment On Hand</CardTitle>
                  <CardDescription>
                    Select the cooking equipment you have available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COMMON_EQUIPMENT.map(equipment => (
                      <button
                        key={equipment}
                        onClick={() => toggleArrayItem('available_equipment', equipment)}
                        className={`px-4 py-3 rounded-lg text-sm transition-colors ${
                          (profile.available_equipment || []).includes(equipment)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {equipment}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy & Location */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-orange-500" />
                    <span>Privacy & Location</span>
                  </CardTitle>
                  <CardDescription>
                    Control who can see your profile and content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="visibility">Profile Visibility</Label>
                    <select
                      id="visibility"
                      value={profile.visibility || 'ANYONE'}
                      onChange={(e) => updateField('visibility', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="ANYONE">Anyone - Public profile</option>
                      <option value="FRIENDS_AND_FOLLOWERS">Friends & Followers</option>
                      <option value="FRIENDS_ONLY">Friends Only</option>
                      <option value="NO_VISIBILITY">No Visibility - Private</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      {getVisibilityExplanation(profile.visibility || 'ANYONE')}
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Sharing</h3>
                    
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.geo_opt_in || false}
                          onChange={(e) => updateField('geo_opt_in', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Map className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">Enable "Near Me" Discovery</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Allow other users to find you based on your location for local cooking communities
                          </p>
                        </div>
                      </label>

                      {profile.geo_opt_in && (
                        <div className="ml-7 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="lat">Latitude</Label>
                              <Input
                                id="lat"
                                type="number"
                                step="any"
                                value={profile.lat || ''}
                                onChange={(e) => updateField('lat', parseFloat(e.target.value) || undefined)}
                                placeholder="e.g., 40.7128"
                              />
                            </div>
                            <div>
                              <Label htmlFor="lng">Longitude</Label>
                              <Input
                                id="lng"
                                type="number"
                                step="any"
                                value={profile.lng || ''}
                                onChange={(e) => updateField('lng', parseFloat(e.target.value) || undefined)}
                                placeholder="e.g., -74.0060"
                              />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            You can find your coordinates using Google Maps or other mapping services. 
                            This helps other users discover you in the "Near Me" feature.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Discovery Preferences</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="diet">Diet Type</Label>
                        <select
                          id="diet"
                          value={profile.diet || ''}
                          onChange={(e) => updateField('diet', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select diet</option>
                          <option value="omnivore">Omnivore</option>
                          <option value="vegetarian">Vegetarian</option>
                          <option value="vegan">Vegan</option>
                          <option value="pescatarian">Pescatarian</option>
                          <option value="keto">Keto</option>
                          <option value="paleo">Paleo</option>
                          <option value="halal">Halal</option>
                          <option value="kosher">Kosher</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="skill_level">Skill Level</Label>
                        <select
                          id="skill_level"
                          value={profile.skill_level || ''}
                          onChange={(e) => updateField('skill_level', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select skill level</option>
                          <option value="beginner">Beginner</option>
                          <option value="home_cook">Home Cook</option>
                          <option value="advanced">Advanced</option>
                          <option value="professional">Professional</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="favorite_cuisine">Favorite Cuisine</Label>
                        <select
                          id="favorite_cuisine"
                          value={profile.favorite_cuisine || ''}
                          onChange={(e) => updateField('favorite_cuisine', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select cuisine</option>
                          {CUISINES.map(cuisine => (
                            <option key={cuisine} value={cuisine}>{cuisine}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      These preferences help us suggest people with similar interests in the "People Like You" discovery feature.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* GPT Authentication */}
            <TabsContent value="gpt" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-orange-500" />
                    <span>RecipeChef Importer GPT</span>
                  </CardTitle>
                  <CardDescription>
                    Get authentication details to import recipes directly from ChatGPT into your RecipeChef account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GPTAuthHelper />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account & Payment */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-orange-500" />
                    <span>Account Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Privacy Settings</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.privacy_public_profile || false}
                          onChange={(e) => updateField('privacy_public_profile', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">
                          <span className="font-medium">Public Profile</span>
                          <p className="text-sm text-gray-500">Allow others to see your profile</p>
                        </span>
                      </label>

                      <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.privacy_share_collections || false}
                          onChange={(e) => updateField('privacy_share_collections', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">
                          <span className="font-medium">Share Collections</span>
                          <p className="text-sm text-gray-500">Let others see your recipe collections</p>
                        </span>
                      </label>

                      <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.privacy_anonymous_reviews !== false}
                          onChange={(e) => updateField('privacy_anonymous_reviews', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">
                          <span className="font-medium">Anonymous Reviews</span>
                          <p className="text-sm text-gray-500">Post reviews without showing your name</p>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Subscription Status</Label>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        profile.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : profile.subscription_status === 'trial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {(profile.subscription_status || 'free').toUpperCase()}
                      </span>
                    </div>
                    {profile.subscription_status !== 'active' && (
                      <Button variant="outline" className="w-full">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Floating Save Button for Mobile */}
          <div className="fixed bottom-6 right-6 lg:hidden">
            <Button
              onClick={saveProfile}
              disabled={saving}
              size="lg"
              className="rounded-full shadow-lg"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </Button>
          </div>
        </main>
      </div>
    </BackgroundWrapper>
  )
}

