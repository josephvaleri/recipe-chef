'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getCurrentProfile, isAdmin } from '@/lib/auth'
import { Shield, ChefHat, Mail, Github, Twitter, Heart } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const userProfile = await getCurrentProfile()
          setProfile(userProfile)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }

    getProfile()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        getCurrentProfile().then(setProfile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <footer className="bg-white/90 backdrop-blur-sm border-t border-orange-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="text-orange-900 font-semibold">Recipe Chef</span>
            </Link>
            <p className="text-sm text-orange-700">
              Your personal culinary companion. Discover, create, and share amazing recipes.
            </p>
            <div className="flex items-center space-x-1 text-sm text-orange-600">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for food lovers</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-orange-900">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/cookbook" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                My Cookbook
              </Link>
              <Link href="/finder" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                Recipe Finder
              </Link>
              <Link href="/calendar" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                Menu Calendar
              </Link>
              <Link href="/add" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                Add Recipe
              </Link>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h3 className="font-semibold text-orange-900">Account</h3>
            <div className="space-y-2">
              <Link href="/auth/signin" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                Sign In
              </Link>
              <Link href="/auth/signup" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                Start Free Trial
              </Link>
              <Link href="/pricing" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                Pricing
              </Link>
            </div>
          </div>

          {/* Admin Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-orange-900">Admin</h3>
            {profile && isAdmin(profile) ? (
              <div className="space-y-2">
                <Link href="/admin" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                  Admin Dashboard
                </Link>
                <Link href="/admin/reference" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                  Reference Data
                </Link>
                <Link href="/admin/csv-import" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                  CSV Import
                </Link>
                <Link href="/moderator" className="block text-sm text-orange-700 hover:text-orange-900 transition-colors">
                  Moderator Tools
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Admin tools are only visible to administrators.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-orange-200 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-orange-600">
            © {new Date().getFullYear()} Recipe Chef. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/privacy" className="text-sm text-orange-700 hover:text-orange-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-orange-700 hover:text-orange-900 transition-colors">
              Terms of Service
            </Link>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600">support@recipechef.com</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
