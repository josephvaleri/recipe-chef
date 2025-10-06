'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile, canManageGlobalContent, isAdmin } from '@/lib/auth'
import { User, LogOut, ChefHat, BookOpen, Calendar, Plus, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function Header() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          const userProfile = await getCurrentProfile()
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error fetching user or profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUserAndProfile()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getCurrentProfile().then(setProfile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-orange-900 font-semibold">Recipe Chef</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link href="/cookbook">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    My Cookbook
                  </Button>
                </Link>
                <Link href="/calendar">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Calendar
                  </Button>
                </Link>
                <Link href="/add">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Recipe
                  </Button>
                </Link>
                {profile && canManageGlobalContent(profile) && (
                  <Link href="/moderator">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Moderator
                    </Button>
                  </Link>
                )}
                {profile && isAdmin(profile) && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <div className="flex items-center space-x-2 text-orange-700">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => router.push('/auth/signin')}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/auth/signup')}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Start Trial
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
