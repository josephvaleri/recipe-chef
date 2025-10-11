import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Create response object
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Create Supabase client for middleware
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

  // Get session
  const { data: { session } } = await supabase.auth.getSession()

  // PHASE 1: Protect basic user routes (not admin yet)
  const protectedRoutes = ['/cookbook', '/calendar', '/shopping-list', '/profile', '/add', '/recipe']
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    // Redirect to sign in
    const redirectUrl = new URL('/auth/signin', req.url)
    // Add return URL so user can go back after login
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

// PHASE 1: Only protect user routes, exclude admin for now
export const config = {
  matcher: [
    '/cookbook/:path*',
    '/calendar/:path*',
    '/shopping-list/:path*',
    '/profile/:path*',
    '/add/:path*',
    '/recipe/:path*'
  ]
}

