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

  const { data: { session } } = await supabase.auth.getSession()

  // Protected user routes
  const protectedRoutes = ['/cookbook', '/calendar', '/shopping-list', '/profile', '/add', '/recipe']
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/signin', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // PHASE 2: Admin route protection
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

  return response
}

// PHASE 2: Include admin routes
export const config = {
  matcher: [
    '/cookbook/:path*',
    '/calendar/:path*',
    '/shopping-list/:path*',
    '/profile/:path*',
    '/add/:path*',
    '/recipe/:path*',
    '/admin/:path*'  // PHASE 2: Added
  ]
}

