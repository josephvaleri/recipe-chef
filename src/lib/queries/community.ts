import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { PrivacySettings, SocialStats, ProfileWithPrivacy } from '@/lib/permissions/privacy'

// Types
export interface PeopleLikeYouResult {
  user_id: string
  display_name: string
  full_name: string
  avatar_url?: string
  score: number
  visibility: string
  is_visible: boolean
  diet?: string
  skill_level?: string
  favorite_cuisine?: string
}

export interface NearMeResult {
  user_id: string
  display_name: string
  full_name: string
  avatar_url?: string
  distance_km: number
  lat?: number
  lng?: number
  visibility: string
  is_visible: boolean
  diet?: string
  skill_level?: string
  favorite_cuisine?: string
}

export interface ProfileSearchResult {
  user_id: string
  display_name: string
  full_name: string
  avatar_url: string | null
  visibility: string
}

export interface FeedEvent {
  event_id: number
  user_id: string
  kind: string
  payload: any
  created_at: string
}

export interface SocialStats {
  friends_count: number
  followers_count: number
  following_count: number
}

export interface RecipeVotes {
  user_recipe_id: number
  upvotes: number
  downvotes: number
  total_votes: number
  user_vote: number | null
}

// My Feed Hook
export function useMyFeed(limit: number = 50) {
  const [data, setData] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    console.log('🔍 [USE-MY-FEED] fetchData called');
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 [USE-MY-FEED] Making API call...');
      console.log('🔍 [USE-MY-FEED] Current URL:', window.location.href);
      const response = await fetch(`/api/my-feed?limit=${limit}`, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      console.log('🔍 [USE-MY-FEED] Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || 'Failed to fetch my feed'}`);
      }
      const result = await response.json()
      console.log('🔍 [USE-MY-FEED] Response data:', result);
      console.log('🔍 [USE-MY-FEED] Result events:', result.events);
      console.log('🔍 [USE-MY-FEED] Result events length:', result.events?.length || 0);
      const eventsArray = result.events || []
      console.log('🔍 [USE-MY-FEED] Setting data to:', eventsArray);
      console.log('🔍 [USE-MY-FEED] About to call setData with:', eventsArray);
      setData(eventsArray)
      console.log('🔍 [USE-MY-FEED] setData called successfully');
    } catch (err) {
      console.error('🔍 [USE-MY-FEED] Error:', err);
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🔍 [USE-MY-FEED] useEffect triggered with limit:', limit);
    console.log('🔍 [USE-MY-FEED] About to call fetchData...');
    fetchData()
  }, [limit])

  return { data, loading, error, refetch: fetchData }
}

// Mark Feed Events as Read Hook
export function useMarkFeedEventsAsRead() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const markAsRead = async (eventIds: number[]) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/my-feed', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ eventIds }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark events as read')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { markAsRead, loading, error }
}

// Discovery Hooks
export function usePeopleLikeYou(limit: number = 20) {
  const [data, setData] = useState<PeopleLikeYouResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/discovery/people-like-you?limit=${limit}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch people like you')
        }
        const result = await response.json()
        setData(result.people || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [limit])

  return { data, loading, error, refetch: () => fetchData() }
}

export function useNearMe(radiusKm: number = 50) {
  const [data, setData] = useState<NearMeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/discovery/near-me?radiusKm=${radiusKm}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch nearby people')
        }
        const result = await response.json()
        setData(result.people || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [radiusKm])

  return { data, loading, error, refetch: () => fetchData() }
}

export function useProfileSearch(query: string, limit: number = 20) {
  const [data, setData] = useState<ProfileSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (query.length < 2) {
      setData([])
      setError(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/discovery/search?q=${encodeURIComponent(query)}&limit=${limit}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to search profiles')
        }
        const result = await response.json()
        setData(result.people || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchData, 300) // Debounce
    return () => clearTimeout(timeoutId)
  }, [query, limit])

  return { data, loading, error, refetch: () => fetchData() }
}

// Follow Hooks
export function useFollow() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const follow = async (followeeId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followeeId }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to follow user')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { follow, loading, error }
}

export function useUnfollow() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const unfollow = async (followeeId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/follow', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followeeId }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unfollow user')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { unfollow, loading, error }
}

// Friend Hooks
export function useSendFriendInvitation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendInvitation = async ({ inviteeId, note }: { inviteeId: string; note?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/friends/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteeId, note }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send friend invitation')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { sendInvitation, loading, error }
}

export function useRespondToFriendInvitation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const respondToInvitation = async ({ invitationId, action }: { invitationId: number; action: 'ACCEPT' | 'DECLINE' }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId, action }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to respond to invitation')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { respondToInvitation, loading, error }
}

// Privacy Settings Hook
export function usePrivacySettings() {
  const [data, setData] = useState<{ profile: PrivacySettings } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/profile/privacy')
        if (!response.ok) {
          throw new Error('Failed to fetch privacy settings')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error, refetch: () => fetchData() }
}

export function useUpdatePrivacySettings() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateSettings = async (settings: Partial<PrivacySettings>) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update privacy settings')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateSettings, loading, error }
}

// Social Stats Hook
export function useSocialStats(userId: string) {
  const [data, setData] = useState<SocialStats>({ friends_count: 0, followers_count: 0, following_count: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: result, error } = await supabase.rpc('get_user_social_stats', {
          p_user_id: userId
        })

        if (error) {
          throw new Error('Failed to fetch social stats')
        }

        setData(result?.[0] || { friends_count: 0, followers_count: 0, following_count: 0 })
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  return { data, loading, error, refetch: () => fetchData() }
}

// Recipe Voting Hook
export function useRecipeVotes(recipeId: number) {
  const [data, setData] = useState<RecipeVotes | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!recipeId) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/recipes/vote?recipeId=${recipeId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recipe votes')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [recipeId])

  return { data, loading, error, refetch: fetchData }
}

export function useVoteOnRecipe() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const vote = async ({ recipeId, value, onSuccess }: { 
    recipeId: number; 
    value: 1 | -1;
    onSuccess?: () => void;
  }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/recipes/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId, value }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to vote on recipe')
      }
      
      const result = await response.json()
      
      // Call onSuccess callback to trigger refetch
      if (onSuccess) {
        onSuccess()
      }
      
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { vote, loading, error }
}

// Recipe Sharing Hook
export function useShareRecipe() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const shareRecipe = async ({ 
    recipeId, 
    recipients, 
    scope, 
    note 
  }: { 
    recipeId: number
    recipients: string[]
    scope?: 'FRIENDS' | 'FOLLOWERS' | 'BOTH'
    note?: string 
  }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/recipes/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId, recipients, scope, note }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to share recipe')
      }
      
      return await response.json()
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { shareRecipe, loading, error }
}