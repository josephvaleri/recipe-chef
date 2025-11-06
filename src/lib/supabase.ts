import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client-side Supabase client with proper cookie handling
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          // Check if we're in a mobile environment (Capacitor)
          if (window.Capacitor) {
            // In mobile, try localStorage as fallback
            try {
              return localStorage.getItem(`supabase.auth.token`) || 
                     localStorage.getItem(`sb-${supabaseUrl.split('//')[1]}-auth-token`)
            } catch (e) {
              return null
            }
          }
          
          // Regular browser cookie handling
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options: any) {
          // Check if we're in a mobile environment (Capacitor)
          if (window.Capacitor) {
            // In mobile, also store in localStorage as backup
            try {
              if (name.includes('auth-token')) {
                localStorage.setItem(`supabase.auth.token`, value)
                localStorage.setItem(`sb-${supabaseUrl.split('//')[1]}-auth-token`, value)
              }
            } catch (e) {
              console.warn('Could not store auth token in localStorage:', e)
            }
          }
          
          // Regular browser cookie handling
          document.cookie = `${name}=${value}; path=/; max-age=604800; samesite=lax`
        },
        remove(name: string, options: any) {
          // Check if we're in a mobile environment (Capacitor)
          if (window.Capacitor) {
            // In mobile, also remove from localStorage
            try {
              localStorage.removeItem(`supabase.auth.token`)
              localStorage.removeItem(`sb-${supabaseUrl.split('//')[1]}-auth-token`)
            } catch (e) {
              console.warn('Could not remove auth token from localStorage:', e)
            }
          }
          
          // Regular browser cookie handling
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      }
    })
  : null

// Server-side admin client (only available in API routes and server components)
export function createAdminClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient(supabaseUrl!, supabaseServiceKey)
}