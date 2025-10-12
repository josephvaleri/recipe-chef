/**
 * Supabase Browser Client (SSR Compatible)
 * Uses @supabase/ssr for proper cookie handling with middleware
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export a singleton instance for convenience
export const supabaseBrowser = createClient()

