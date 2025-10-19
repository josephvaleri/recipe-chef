'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Users, 
  Heart, 
  MessageCircle, 
  Trophy, 
  TrendingUp,
  UserPlus,
  UserCheck,
  Share2,
  ThumbsUp,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useMyFeed, useMarkFeedEventsAsRead } from '@/lib/queries/community'

interface FeedEvent {
  event_id: number
  kind: 'FRIEND_REQUEST' | 'FOLLOW_REQUEST' | 'DIRECT_SHARE' | 'GROUP_UPDATE' | 'BADGE_EARNED' | 'BADGE_NUDGE' | 'RECIPE_UPVOTES'
  payload: any
  created_at: string
  read_at?: string
}

export default function MyFeed() {
  const { data: feedData, loading: isLoading, error } = useMyFeed(20)
  const { markAsRead, loading: markingAsRead } = useMarkFeedEventsAsRead()

  const handleMarkAsRead = async (eventIds: number[]) => {
    try {
      await markAsRead(eventIds)
    } catch (error) {
      console.error('Failed to mark events as read:', error)
    }
  }

  const getEventIcon = (kind: string) => {
    switch (kind) {
      case 'FRIEND_REQUEST':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'FOLLOW_REQUEST':
        return <UserCheck className="h-4 w-4 text-green-500" />
      case 'DIRECT_SHARE':
        return <Share2 className="h-4 w-4 text-purple-500" />
      case 'GROUP_UPDATE':
        return <MessageCircle className="h-4 w-4 text-orange-500" />
      case 'BADGE_EARNED':
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 'BADGE_NUDGE':
        return <TrendingUp className="h-4 w-4 text-indigo-500" />
      case 'RECIPE_UPVOTES':
        return <ThumbsUp className="h-4 w-4 text-red-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventTitle = (event: FeedEvent) => {
    switch (event.kind) {
      case 'FRIEND_REQUEST':
        return event.payload.type === 'received' 
          ? `Friend request from ${event.payload.inviter_name}`
          : `You and ${event.payload.friend_name} are now friends!`
      case 'FOLLOW_REQUEST':
        return 'New follower'
      case 'DIRECT_SHARE':
        return `${event.payload.sender_name} shared a recipe with you`
      case 'GROUP_UPDATE':
        return `Update in ${event.payload.group?.name || 'your group'}`
      case 'BADGE_EARNED':
        return `🎉 You earned the ${event.payload.badge?.name || 'new badge'}!`
      case 'BADGE_NUDGE':
        return `You're ${event.payload.remaining} away from ${event.payload.target}`
      case 'RECIPE_UPVOTES':
        return `Your recipe got ${event.payload.upvotes_in_24h} upvotes!`
      default:
        return 'New activity'
    }
  }

  const getEventDescription = (event: FeedEvent) => {
    switch (event.kind) {
      case 'FRIEND_REQUEST':
        return event.payload.type === 'received' 
          ? event.payload.note || 'Wants to be friends'
          : 'You can now see each other\'s content'
      case 'DIRECT_SHARE':
        return event.payload.message || `Check out "${event.payload.recipe_title}"`
      case 'BADGE_EARNED':
        return event.payload.badge?.description || 'Great job!'
      case 'BADGE_NUDGE':
        return 'Keep going to unlock this achievement'
      case 'RECIPE_UPVOTES':
        return `"${event.payload.recipe_title}" is getting popular!`
      default:
        return ''
    }
  }

  const getEventActions = (event: FeedEvent) => {
    switch (event.kind) {
      case 'FRIEND_REQUEST':
        if (event.payload.type === 'received') {
          return (
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="default">
                Accept
              </Button>
              <Button size="sm" variant="outline">
                Decline
              </Button>
            </div>
          )
        }
        return null
      case 'DIRECT_SHARE':
        return (
          <Button size="sm" variant="outline" className="mt-2" asChild>
            <Link href={`/recipe/${event.payload.recipe_id}`}>
              View Recipe
            </Link>
          </Button>
        )
      case 'RECIPE_UPVOTES':
        return (
          <Button size="sm" variant="outline" className="mt-2" asChild>
            <Link href={`/recipe/${event.payload.recipe_id}`}>
              View Recipe
            </Link>
          </Button>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            My Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading your feed...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            My Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Failed to load feed. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  const events = feedData || []
  const unreadEvents = events.filter(event => !event.read_at)
  

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          My Feed
          {unreadEvents.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadEvents.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No activity yet. Start connecting with other cooks to see updates here!
          </div>
        ) : (
          <div className="h-[400px] overflow-y-auto pr-2">
            <div className="space-y-3">
              {events.map((event) => (
                <motion.div
                  key={event.event_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-3 rounded-lg border transition-colors ${
                    event.read_at 
                      ? 'border-gray-100 bg-gray-50' 
                      : 'border-orange-200 bg-orange-50'
                  }`}
                  onClick={() => {
                    if (!event.read_at) {
                      handleMarkAsRead([event.event_id])
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-orange-900">
                        {getEventTitle(event)}
                      </div>
                      {getEventDescription(event) && (
                        <div className="text-xs text-orange-600 mt-1">
                          {getEventDescription(event)}
                        </div>
                      )}
                      <div className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.created_at).toLocaleDateString()}
                      </div>
                      {getEventActions(event)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {events.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => {
                const unreadIds = unreadEvents.map(e => e.event_id)
                if (unreadIds.length > 0) {
                  handleMarkAsRead(unreadIds)
                }
              }}
            >
              Mark All as Read
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
