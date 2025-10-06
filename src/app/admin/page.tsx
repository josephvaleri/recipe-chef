'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Users, Settings, Database, AlertTriangle, ChefHat, Package } from 'lucide-react'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const currentProfile = await getCurrentProfile()
      
      if (!currentUser || !currentProfile) {
        router.push('/auth/signin')
        return
      }

      if (!isAdmin(currentProfile)) {
        router.push('/')
        return
      }

      setUser(currentUser)
      setProfile(currentProfile)
      
      // Load users for admin dashboard
      await loadUsers()
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/auth/signin')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Get profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Get user emails separately from auth.users
      const userIds = profiles?.map(p => p.user_id) || []
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        console.warn('Could not fetch auth users:', authError)
        // If we can't get auth data, just use profiles
        setUsers(profiles || [])
        return
      }

      // Merge the data
      const usersWithAuth = profiles?.map(profile => {
        const authUser = authUsers.users.find(u => u.id === profile.user_id)
        return {
          ...profile,
          email: authUser?.email || 'Unknown',
          auth_created_at: authUser?.created_at
        }
      }) || []

      setUsers(usersWithAuth)
    } catch (error) {
      console.error('Error loading users:', error)
      // Fallback: just load profiles without auth data
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
        setUsers(profiles || [])
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'moderator': return 'bg-yellow-100 text-yellow-800'
      case 'user': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-orange-100 text-orange-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="text-center">
          <Shield className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-pulse" />
          <p className="text-orange-700">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
              <h1 className="text-4xl font-bold text-orange-900">Admin Dashboard</h1>
            </div>
            <p className="text-orange-700 text-lg">
              Manage users, content, and system settings
            </p>
            <Badge className="mt-2 bg-orange-100 text-orange-800">
              Welcome, {profile.full_name || user.email}
            </Badge>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{users.length}</div>
                <p className="text-xs text-orange-600">Registered users</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <p className="text-xs text-green-600">Currently active</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">Trial Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {users.filter(u => u.status === 'trial').length}
                </div>
                <p className="text-xs text-orange-600">On free trial</p>
              </CardContent>
            </Card>
          </div>

          {/* Role Management */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span>Role Management</span>
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <Shield className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-red-900">Admin</h3>
                    <p className="text-sm text-red-700">
                      Full system access, user management, settings
                    </p>
                    <Badge className="mt-2 bg-red-100 text-red-800">
                      {users.filter(u => u.role === 'admin').length} users
                    </Badge>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Database className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-yellow-900">Moderator</h3>
                    <p className="text-sm text-yellow-700">
                      Content moderation, global recipe management
                    </p>
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                      {users.filter(u => u.role === 'moderator').length} users
                    </Badge>
                  </div>

                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-blue-900">User</h3>
                    <p className="text-sm text-blue-700">
                      Personal recipes, basic features
                    </p>
                    <Badge className="mt-2 bg-blue-100 text-blue-800">
                      {users.filter(u => u.role === 'user').length} users
                    </Badge>
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-900">All Users</h4>
                  {users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium text-orange-900">
                            {user.full_name || 'No name'}
                          </p>
                          <p className="text-sm text-orange-600">
                            {user.email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                        {user.has_ai_subscription && (
                          <Badge className="bg-purple-100 text-purple-800">
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-orange-600" />
                <span>Admin Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Back to App
                </Button>
                <Button
                  onClick={() => router.push('/admin/reference')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Reference Data
                </Button>
                <Button
                  onClick={() => router.push('/admin/csv-import')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <ChefHat className="w-4 h-4 mr-2" />
                  CSV Import
                </Button>
                <Button
                  onClick={() => router.push('/admin/settings')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
