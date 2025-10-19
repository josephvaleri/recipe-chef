'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserPlus, 
  Heart, 
  UserCheck,
  UserX,
  MapPin,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useFollow, useUnfollow, useSendFriendInvitation, useSocialStats } from '@/lib/queries/community'
import { ProfileWithPrivacy } from '@/lib/permissions/privacy'

interface ProfileCardProps {
  profile: ProfileWithPrivacy
  showActions?: boolean
  showSocialStats?: boolean
  showLocation?: boolean
  className?: string
}

export default function ProfileCard({ 
  profile, 
  showActions = true, 
  showSocialStats = true,
  showLocation = false,
  className = ''
}: ProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(false) // This would come from a hook in real implementation
  const [isFriend, setIsFriend] = useState(false) // This would come from a hook in real implementation
  
  const { follow, loading: following } = useFollow()
  const { unfollow, loading: unfollowing } = useUnfollow()
  const { sendInvitation, loading: sendingInvitation } = useSendFriendInvitation()
  const { data: socialStats } = useSocialStats(profile.user_id)

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await unfollow(profile.user_id)
        setIsFollowing(false)
      } else {
        await follow(profile.user_id)
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  const handleSendFriendInvitation = async () => {
    try {
      console.log('Sending friend invitation to:', profile.user_id)
      const result = await sendInvitation({ inviteeId: profile.user_id })
      console.log('Friend invitation result:', result)
      // Show success message
      alert('Friend invitation sent successfully!')
    } catch (error: any) {
      console.error('Failed to send friend invitation:', error)
      
      // Handle specific error cases
      if (error.message?.includes('already sent')) {
        alert('Friend invitation already sent!')
      } else if (error.message?.includes('already friends')) {
        alert('You are already friends with this user!')
      } else {
        alert('Failed to send friend invitation. Please try again.')
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`p-4 rounded-lg border transition-colors ${
        profile.is_visible 
          ? 'border-orange-100 hover:border-orange-200 bg-white' 
          : 'border-gray-200 bg-gray-50'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.is_visible ? (
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <Users className="w-6 h-6 text-white" />
              )}
            </div>
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
              <UserX className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Name and Status */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-orange-900 truncate">
              {profile.display_name}
            </h3>
            {!profile.is_visible && (
              <Badge variant="secondary" className="text-xs">
                Anonymous
              </Badge>
            )}
          </div>
          
          {/* Social Stats */}
          {profile.is_visible && showSocialStats && socialStats && (
            <div className="text-sm text-orange-600 mb-2">
              {socialStats.friends_count} friends • {socialStats.followers_count} followers
            </div>
          )}
          
          {/* Preferences */}
          {profile.is_visible && (
            <div className="flex flex-wrap gap-1 mb-2">
              {profile.diet && (
                <Badge variant="outline" className="text-xs">
                  {profile.diet}
                </Badge>
              )}
              {profile.skill_level && (
                <Badge variant="outline" className="text-xs">
                  {profile.skill_level}
                </Badge>
              )}
              {profile.favorite_cuisine && (
                <Badge variant="outline" className="text-xs">
                  {profile.favorite_cuisine}
                </Badge>
              )}
            </div>
          )}
          
          {/* Location */}
          {profile.is_visible && showLocation && profile.lat && profile.lng && (
            <div className="text-xs text-orange-500 flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3" />
              Location shared
            </div>
          )}
          
          {/* Actions */}
          {showActions && profile.is_visible && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={isFollowing ? "default" : "outline"}
                onClick={handleFollow}
                disabled={following || unfollowing}
                className="flex-1"
              >
                {following || unfollowing ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="w-3 h-3 mr-1" />
                ) : (
                  <Heart className="w-3 h-3 mr-1" />
                )}
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              
              {!isFriend && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={handleSendFriendInvitation}
                  disabled={sendingInvitation}
                  className="flex-1"
                >
                  {sendingInvitation ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3 mr-1" />
                  )}
                  Add Friend
                </Button>
              )}
              
              {isFriend && (
                <Button 
                  size="sm" 
                  variant="default"
                  disabled
                  className="flex-1"
                >
                  <UserCheck className="w-3 h-3 mr-1" />
                  Friends
                </Button>
              )}
            </div>
          )}
          
          {/* Privacy Notice */}
          {!profile.is_visible && (
            <div className="text-xs text-gray-500 mt-2">
              This user has chosen to keep their profile private
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
