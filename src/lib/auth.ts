import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  user_id: string
  full_name?: string
  avatar_url?: string
  role: 'admin' | 'moderator' | 'user'
  status: 'active' | 'inactive' | 'trial'
  has_ai_subscription: boolean
  trial_started_at?: string
  trial_ends_at?: string
  pantry_ingredients?: number[]
  created_at: string
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const callId = `getCurrentProfile-${Math.random().toString(36).substr(2, 9)}`
  console.log(`[${callId}] getCurrentProfile called`)
  
  const user = await getCurrentUser()
  if (!user) {
    console.log(`[${callId}] No user found, returning null`)
    return null
  }

  console.log(`[${callId}] User found: ${user.id}, querying profiles table`)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error(`[${callId}] Error fetching profile:`, error)
    return null
  }

  console.log(`[${callId}] Profile fetched successfully:`, data?.user_id)
  return data
}

export async function createProfile(userId: string, fullName?: string): Promise<Profile | null> {
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14) // 14-day trial

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: fullName,
      role: 'user',
      status: 'trial',
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      has_ai_subscription: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  return data
}

export function isTrialExpired(profile: Profile): boolean {
  if (profile.status !== 'trial') return false
  if (!profile.trial_ends_at) return true
  return new Date(profile.trial_ends_at) < new Date()
}

export function canUseAI(profile: Profile): boolean {
  return profile.status === 'active' && profile.has_ai_subscription
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === 'admin'
}

export function isModerator(profile: Profile): boolean {
  return profile.role === 'moderator' || profile.role === 'admin'
}

export function canManageGlobalContent(profile: Profile): boolean {
  return profile.role === 'admin' || profile.role === 'moderator'
}

export function canAccessSettings(profile: Profile): boolean {
  return profile.role === 'admin'
}
