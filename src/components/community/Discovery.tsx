'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Users, 
  MapPin, 
  UserPlus, 
  Heart,
  Map,
  Loader2,
  UserCheck,
  UserX
} from 'lucide-react'
import { motion } from 'framer-motion'
import { usePeopleLikeYou, useSearchProfiles, useNearMe } from '@/features/community/discovery/hooks'
import ProfileCard from './ProfileCard'
import { ProfileWithPrivacy } from '@/lib/permissions/privacy'

interface Profile extends ProfileWithPrivacy {
  score?: number
  distance_km?: number
}

// Transform API response to ProfileWithPrivacy format
const transformToProfile = (item: any, type: 'people-like-you' | 'search' | 'near-me'): Profile => {
  const isVisible = item.display_name !== 'Anonymous'
  
  return {
    user_id: item.user_id,
    display_name: item.display_name,
    full_name: item.display_name, // API only returns display_name
    avatar_url: undefined, // Not provided by new API
    visibility: isVisible ? 'ANYONE' : 'NO_VISIBILITY',
    is_visible: isVisible,
    ...(type === 'people-like-you' && { score: item.score }),
    ...(type === 'near-me' && { distance_km: item.distance_km }),
  }
}

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('people-like-you')
  
  const { data: peopleLikeYouData, isLoading: loadingPeopleLikeYou } = usePeopleLikeYou(20)
  const { data: nearMeData, isLoading: loadingNearMe, error: nearMeError } = useNearMe(50)
  const { data: searchData, isLoading: loadingSearch } = useSearchProfiles(searchQuery, 20)
  
  console.log('🔍 [DISCOVERY] Component state:', {
    activeTab,
    nearMeData: nearMeData?.length,
    loadingNearMe,
    nearMeError: nearMeError?.message
  })
  
  

  const LoadingState = () => (
    <div className="text-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  )

  const EmptyState = ({ message, icon: Icon = Users, action }: { message: string; icon?: any; action?: React.ReactNode }) => (
    <div className="text-center py-8">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <div className="text-sm text-muted-foreground mb-3">{message}</div>
      {action}
    </div>
  )

  const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div className="text-center py-8">
      <UserX className="w-12 h-12 text-red-300 mx-auto mb-3" />
      <div className="text-sm text-red-600 mb-3">{message}</div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          Discover People
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="people-like-you">Like You</TabsTrigger>
            <TabsTrigger value="near-me">Near Me</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="people-like-you" className="mt-4">
            {loadingPeopleLikeYou ? (
              <LoadingState />
            ) : peopleLikeYouData?.length === 0 ? (
              <EmptyState 
                message="No similar people found. Try updating your preferences in your profile!" 
                icon={Users}
                action={
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/profile'}>
                    Update Profile
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {peopleLikeYouData?.map((item: any) => {
                  const profile = transformToProfile(item, 'people-like-you')
                  return (
                    <ProfileCard 
                      key={profile.user_id} 
                      profile={profile} 
                      showLocation={false}
                    />
                  )
                })}
              </div>
            )}
          </TabsContent>
          
            <TabsContent value="near-me" className="mt-4">
              {loadingNearMe ? (
                <LoadingState />
              ) : nearMeError ? (
                <ErrorState 
                  message={nearMeError.message || "Failed to load nearby people. Please try again."}
                  onRetry={() => window.location.reload()}
                />
              ) : nearMeData?.length === 0 ? (
                <EmptyState 
                  message="No nearby people found. Enable location sharing in your profile to discover local cooks!" 
                  icon={MapPin}
                  action={
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/profile'}>
                      Enable Location
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {nearMeData?.map((item: any) => {
                    const profile = transformToProfile(item, 'near-me')
                    return (
                      <ProfileCard 
                        key={profile.user_id} 
                        profile={profile} 
                        showLocation={true}
                      />
                    )
                  })}
                </div>
              )}
            </TabsContent>
          
          <TabsContent value="search" className="mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {loadingSearch ? (
                <LoadingState />
              ) : searchQuery.length < 2 ? (
                <EmptyState 
                  message="Enter at least 2 characters to search for people"
                  icon={Search}
                />
              ) : searchData?.length === 0 ? (
                <EmptyState 
                  message={`No people found matching "${searchQuery}". Try a different search term.`}
                  icon={Search}
                />
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {searchData?.map((item: any) => {
                    const profile = transformToProfile(item, 'search')
                    return (
                      <ProfileCard 
                        key={profile.user_id} 
                        profile={profile} 
                        showLocation={false}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
