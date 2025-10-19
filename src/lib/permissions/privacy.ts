import { supabase } from '@/lib/supabase'

export type UserVisibility = 'NO_VISIBILITY' | 'FRIENDS_ONLY' | 'FRIENDS_AND_FOLLOWERS' | 'ANYONE'

export interface PrivacySettings {
  visibility: UserVisibility
  geo_opt_in: boolean
  lat?: number
  lng?: number
  diet?: string
  skill_level?: string
  favorite_cuisine?: string
}

export interface SocialStats {
  friends_count: number
  followers_count: number
  following_count: number
}

export interface ProfileWithPrivacy {
  user_id: string
  display_name: string
  full_name: string
  avatar_url?: string
  visibility: UserVisibility
  is_visible: boolean
  social_stats?: SocialStats
  diet?: string
  skill_level?: string
  favorite_cuisine?: string
  lat?: number
  lng?: number
}

/**
 * Check if a viewer can see a profile owner's content
 */
export async function canViewProfile(viewerId: string, ownerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_view_profile', {
      viewer: viewerId,
      owner: ownerId
    })
    
    if (error) {
      console.error('Error checking profile visibility:', error)
      return false
    }
    
    return data || false
  } catch (error) {
    console.error('Error in canViewProfile:', error)
    return false
  }
}

/**
 * Get safe display name (returns "Anonymous" if viewer cannot see profile)
 */
export async function getSafeDisplayName(viewerId: string, ownerId: string, fallback: string = 'Anonymous'): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('safe_display_name', {
      viewer: viewerId,
      owner: ownerId,
      fallback
    })
    
    if (error) {
      console.error('Error getting safe display name:', error)
      return fallback
    }
    
    return data || fallback
  } catch (error) {
    console.error('Error in getSafeDisplayName:', error)
    return fallback
  }
}

/**
 * Get user's privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('visibility, geo_opt_in, lat, lng, diet, skill_level, favorite_cuisine')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error getting privacy settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getPrivacySettings:', error)
    return null
  }
}

/**
 * Update user's privacy settings
 */
export async function updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('profiles')
      .update(settings)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating privacy settings:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updatePrivacySettings:', error)
    return false
  }
}

/**
 * Get user's social stats (friends, followers, following counts)
 */
export async function getSocialStats(userId: string): Promise<SocialStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_social_stats', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error getting social stats:', error)
      return null
    }

    return data?.[0] || { friends_count: 0, followers_count: 0, following_count: 0 }
  } catch (error) {
    console.error('Error in getSocialStats:', error)
    return null
  }
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_friends')
      .select('user_id')
      .or(`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`)
      .limit(1)

    if (error) {
      console.error('Error checking friendship:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error in areFriends:', error)
    return false
  }
}

/**
 * Check if user1 follows user2
 */
export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('followee_id', followeeId)
      .limit(1)

    if (error) {
      console.error('Error checking follow status:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error in isFollowing:', error)
    return false
  }
}

/**
 * Apply privacy filtering to a list of profiles
 */
export function applyPrivacyFilter<T extends ProfileWithPrivacy>(
  profiles: T[],
  viewerId: string
): T[] {
  return profiles.map(profile => ({
    ...profile,
    display_name: profile.is_visible ? profile.display_name : 'Anonymous',
    full_name: profile.is_visible ? profile.full_name : 'Anonymous',
    avatar_url: profile.is_visible ? profile.avatar_url : undefined,
    social_stats: profile.is_visible ? profile.social_stats : undefined,
    diet: profile.is_visible ? profile.diet : undefined,
    skill_level: profile.is_visible ? profile.skill_level : undefined,
    favorite_cuisine: profile.is_visible ? profile.favorite_cuisine : undefined,
    lat: profile.is_visible ? profile.lat : undefined,
    lng: profile.is_visible ? profile.lng : undefined
  }))
}

/**
 * Get privacy explanation text
 */
export function getPrivacyExplanation(visibility: UserVisibility): string {
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
