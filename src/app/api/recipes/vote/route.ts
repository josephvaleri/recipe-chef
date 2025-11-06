export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { regionHeader } from '@/lib/route-config'
import { z } from 'zod'

const voteSchema = z.object({
  recipeId: z.number().int().positive(),
  value: z.union([z.literal(1), z.literal(-1)])
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipeId, value } = voteSchema.parse(body)

    // Check if recipe exists
    const { data: recipe, error: recipeError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, user_id')
      .eq('user_recipe_id', recipeId)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Check if user can view the recipe (privacy check)
    const { data: canView } = await supabase.rpc('can_view_profile', {
      viewer: user.id,
      owner: recipe.user_id
    })

    if (!canView) {
      return NextResponse.json({ error: 'Cannot vote on this recipe' }, { status: 403 })
    }

    // Upsert vote (insert or update)
    const { data: vote, error: voteError } = await supabase
      .from('recipe_votes')
      .upsert({
        user_recipe_id: recipeId,
        voter_id: user.id,
        value: value
      }, {
        onConflict: 'user_recipe_id,voter_id'
      })
      .select()
      .single()

    if (voteError) {
      return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
    }

    // Get current vote counts
    const { data: voteCounts, error: countsError } = await supabase
      .from('recipe_votes')
      .select('value')
      .eq('user_recipe_id', recipeId)

    if (countsError) {
      console.error('Failed to get vote counts:', countsError)
    }

    const upvotes = voteCounts?.filter(v => v.value === 1).length || 0
    const downvotes = voteCounts?.filter(v => v.value === -1).length || 0
    const totalVotes = upvotes - downvotes

    // Check for upvote burst (10+ upvotes in 24h) and create re-engagement event
    if (value === 1) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: recentUpvotes, error: recentError } = await supabase
        .from('recipe_votes')
        .select('voter_id')
        .eq('user_recipe_id', recipeId)
        .eq('value', 1)
        .gte('created_at', twentyFourHoursAgo)

      if (!recentError && recentUpvotes && recentUpvotes.length >= 10) {
        // Create re-engagement feed event for recipe owner
        const { error: feedError } = await supabase
          .from('feed_events')
          .insert({
            user_id: recipe.user_id,
            kind: 'RECIPE_UPVOTES',
            payload: {
              user_recipe_id: recipeId,
              recipe_title: recipe.title,
              upvotes_in_24h: recentUpvotes.length,
              total_votes: totalVotes
            }
          })

        if (feedError) {
          console.error('Failed to create re-engagement feed event:', feedError)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Vote recorded',
      vote: {
        user_recipe_id: recipeId,
        value: value,
        upvotes,
        downvotes,
        total_votes: totalVotes
      }
    }, { headers: regionHeader() })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    console.error('Recipe vote API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipeId = parseInt(searchParams.get('recipeId') || '0')

    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }

    // Get vote counts for the recipe
    const { data: votes, error: votesError } = await supabase
      .from('recipe_votes')
      .select('value')
      .eq('user_recipe_id', recipeId)

    if (votesError) {
      return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 })
    }

    // Get user's vote if any
    const { data: userVote, error: userVoteError } = await supabase
      .from('recipe_votes')
      .select('value')
      .eq('user_recipe_id', recipeId)
      .eq('voter_id', user.id)
      .single()

    if (userVoteError && userVoteError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: 'Failed to get user vote' }, { status: 500 })
    }

    const upvotes = votes?.filter(v => v.value === 1).length || 0
    const downvotes = votes?.filter(v => v.value === -1).length || 0
    const totalVotes = upvotes - downvotes

    return NextResponse.json({
      user_recipe_id: recipeId,
      upvotes,
      downvotes,
      total_votes: totalVotes,
      user_vote: userVote?.value || null
    })

  } catch (error) {
    console.error('Get votes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
