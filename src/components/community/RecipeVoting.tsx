'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { useRecipeVotes, useVoteOnRecipe } from '@/lib/queries/community'

interface RecipeVotingProps {
  recipeId: number
  className?: string
  showCounts?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function RecipeVoting({ 
  recipeId, 
  className = '',
  showCounts = true,
  size = 'md'
}: RecipeVotingProps) {
  const { data: votesData, loading: isLoading, refetch } = useRecipeVotes(recipeId)
  const { vote, loading: voting } = useVoteOnRecipe()

  const handleVote = async (value: 1 | -1) => {
    try {
      await vote({ recipeId, value, onSuccess: refetch })
    } catch (error) {
      console.error('Failed to vote on recipe:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading votes...</span>
      </div>
    )
  }

  const votes = votesData || {
    user_recipe_id: recipeId,
    upvotes: 0,
    downvotes: 0,
    total_votes: 0,
    user_vote: null
  }

  const sizeClasses = {
    sm: {
      button: 'h-8 px-2',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      button: 'h-9 px-3',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      button: 'h-10 px-4',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Upvote Button */}
      <Button
        variant={votes.user_vote === 1 ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote(1)}
        disabled={voting}
        className={`${currentSize.button} ${
          votes.user_vote === 1 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'hover:bg-green-50 hover:border-green-300'
        }`}
      >
        {voting ? (
          <Loader2 className={`${currentSize.icon} animate-spin`} />
        ) : (
          <ThumbsUp className={currentSize.icon} />
        )}
        {showCounts && (
          <span className={`ml-1 ${currentSize.text}`}>
            {votes.upvotes}
          </span>
        )}
      </Button>

      {/* Downvote Button */}
      <Button
        variant={votes.user_vote === -1 ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={voting}
        className={`${currentSize.button} ${
          votes.user_vote === -1 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'hover:bg-red-50 hover:border-red-300'
        }`}
      >
        {voting ? (
          <Loader2 className={`${currentSize.icon} animate-spin`} />
        ) : (
          <ThumbsDown className={currentSize.icon} />
        )}
        {showCounts && (
          <span className={`ml-1 ${currentSize.text}`}>
            {votes.downvotes}
          </span>
        )}
      </Button>

    </div>
  )
}
