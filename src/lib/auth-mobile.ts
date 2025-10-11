/**
 * Mobile-specific authentication utilities
 * Handles OAuth with deep link callbacks for iOS and Android
 */

import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

// Mobile callback URL from environment
const MOBILE_CALLBACK_URL = process.env.NEXT_PUBLIC_MOBILE_CALLBACK_URL || 'recipechef://auth/callback';

/**
 * Sign in with Google OAuth (Mobile)
 * Opens browser for OAuth flow, then returns to app via deep link
 */
export async function signInWithGoogleMobile() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: MOBILE_CALLBACK_URL,
        skipBrowserRedirect: false,
      }
    });

    if (error) {
      console.error('OAuth error:', error);
      throw error;
    }

    // Open the OAuth URL in the system browser
    if (data.url) {
      await Browser.open({ url: data.url });
    }

    return data;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback from deep link
 * Call this when app receives recipechef://auth/callback?...
 */
export async function handleOAuthCallback(url: string) {
  try {
    // Extract the URL parameters
    const urlObj = new URL(url);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    
    // Get the access token from the hash
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (access_token && refresh_token) {
      // Set the session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error('Error setting session:', error);
        throw error;
      }

      // Close the browser
      await Browser.close();

      return data;
    } else {
      throw new Error('No tokens found in callback URL');
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    await Browser.close();
    throw error;
  }
}

/**
 * Detect if running in mobile app (Capacitor)
 */
export function isMobileApp(): boolean {
  return typeof window !== 'undefined' && 'Capacitor' in window;
}

/**
 * Sign out (Mobile & Web)
 */
export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

