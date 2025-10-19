/**
 * Helper functions for GPT authentication
 * This allows users to get their authentication details for use with the RecipeChef Importer GPT
 */

import { supabase } from '@/lib/supabase'

export interface GPTAuthDetails {
  user_id: string
  auth_token: string
  expires_at: string
}

/**
 * Get authentication details for GPT usage
 * This should be called from the RecipeChef app when the user is signed in
 */
export async function getGPTAuthDetails(): Promise<GPTAuthDetails | null> {
  try {
    
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session || !session.user) {
      console.error('No active session found:', error)
      return null
    }

    return {
      user_id: session.user.id,
      auth_token: session.access_token,
      expires_at: new Date(session.expires_at! * 1000).toISOString()
    }
  } catch (error) {
    console.error('Error getting GPT auth details:', error)
    return null
  }
}

/**
 * Copy authentication details to clipboard for easy pasting into GPT
 */
export async function copyGPTAuthToClipboard(): Promise<boolean> {
  try {
    const authDetails = await getGPTAuthDetails()
    
    if (!authDetails) {
      alert('Please sign in to RecipeChef first to get your authentication details.')
      return false
    }

    const authText = `Here are my RecipeChef authentication details:
User ID: ${authDetails.user_id}
Auth Token: ${authDetails.auth_token}
Expires: ${authDetails.expires_at}

Please use these to save the recipe to my RecipeChef account.`

    await navigator.clipboard.writeText(authText)
    alert('Authentication details copied to clipboard! Paste them into the GPT to save recipes to your account.')
    return true
  } catch (error) {
    console.error('Error copying auth details:', error)
    alert('Failed to copy authentication details. Please try again.')
    return false
  }
}

/**
 * Generate a shareable link with embedded auth details
 * This creates a special link that the GPT can use
 */
export async function generateGPTShareLink(): Promise<string | null> {
  try {
    const authDetails = await getGPTAuthDetails()
    
    if (!authDetails) {
      return null
    }

    // Create a secure shareable link (in a real implementation, you'd want to encrypt this)
    const shareData = {
      user_id: authDetails.user_id,
      auth_token: authDetails.auth_token,
      expires_at: authDetails.expires_at
    }

    // In a real implementation, you'd want to:
    // 1. Encrypt the auth details
    // 2. Store them in a secure temporary endpoint
    // 3. Return a short-lived shareable link
    
    const encodedData = btoa(JSON.stringify(shareData))
    return `${window.location.origin}/gpt-auth/${encodedData}`
  } catch (error) {
    console.error('Error generating share link:', error)
    return null
  }
}

/**
 * Validate if auth details are still valid
 */
export async function validateGPTAuth(authDetails: GPTAuthDetails): Promise<boolean> {
  try {
    
    // Try to get user with the provided token
    const { data: { user }, error } = await supabase.auth.getUser(authDetails.auth_token)
    
    if (error || !user || user.id !== authDetails.user_id) {
      return false
    }

    // Check if token is expired
    const expiresAt = new Date(authDetails.expires_at)
    if (expiresAt < new Date()) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error validating auth:', error)
    return false
  }
}
