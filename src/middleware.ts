// PHASE 2: Add admin protection
// To activate: Rename this to middleware.ts (backup current one first)

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get current session and refresh if needed
  let { data: { session } } = await supabase.auth.getSession()
  
  // If no session or session is expired, try to refresh it
  if (!session || (session.expires_at && new Date(session.expires_at * 1000) < new Date())) {
    console.log(`🔄 [MIDDLEWARE] Session missing or expired on ${req.nextUrl.pathname}, attempting refresh...`)
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError) {
      console.log('❌ [MIDDLEWARE] Session refresh failed:', refreshError.message)
    } else if (refreshedSession) {
      console.log(`✅ [MIDDLEWARE] Session refreshed successfully on ${req.nextUrl.pathname}`)
      session = refreshedSession
    } else {
      console.log('⚠️ [MIDDLEWARE] No session available after refresh attempt')
    }
  } else if (session) {
    console.log(`✅ [MIDDLEWARE] Valid session found on ${req.nextUrl.pathname}`)
  }

  // Protected user routes (includes all routes currently using RouteGuard)
  const protectedRoutes = [
    '/cookbook', 
    '/calendar', 
    '/shopping-list', 
    '/profile', 
    '/add', 
    '/recipe', 
    '/community',
    '/badges',      // Added from RouteGuard
    '/import',      // Added from RouteGuard
    '/groups',      // Added from RouteGuard
    '/moderator'    // Added from RouteGuard
  ]
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  // Only require authentication for protected routes (not home page)
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/signin', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin route protection
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // Check admin role
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        // Not authorized - redirect to home
        return NextResponse.redirect(new URL('/', req.url))
      }
    } catch (error) {
      console.error('Error checking admin role:', error)
      // On error, deny access
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Moderator route protection
  if (req.nextUrl.pathname.startsWith('/moderator')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // Check moderator role
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        // Not authorized - redirect to home
        return NextResponse.redirect(new URL('/', req.url))
      }
    } catch (error) {
      console.error('Error checking moderator role:', error)
      // On error, deny access
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return response
}

// Complete route protection - includes all routes previously using RouteGuard
// Also includes home page for session refresh (but not authentication requirement)
export const config = {
  matcher: [
    '/',                 // Home page - for session refresh only
    '/cookbook/:path*',
    '/calendar/:path*',
    '/shopping-list/:path*',
    '/profile/:path*',
    '/add/:path*',
    '/recipe/:path*',
    '/community/:path*',
    '/badges/:path*',     // Added from RouteGuard
    '/import/:path*',     // Added from RouteGuard
    '/groups/:path*',     // Added from RouteGuard
    '/moderator/:path*',  // Added from RouteGuard
    '/admin/:path*'
  ]
}

