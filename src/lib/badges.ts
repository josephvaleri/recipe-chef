/**
 * Badge System Client Utilities
 * Provides type-safe event logging and badge management
 */

import { supabase } from '@/lib/supabase';

// ==========================================
// TYPES
// ==========================================

export type UserEventType =
  | 'recipe_added'
  | 'recipe_cooked'
  | 'rating_left'
  | 'photo_uploaded'
  | 'calendar_added'
  | 'shopping_list_generated'
  | 'alexa_pushed'
  | 'ai_query'
  | 'ai_accept_result'
  | 'recipe_added_to_other_user'
  | 'recipe_accepted_global'
  | 'unit_conversion_used'
  | 'bug_report_confirmed'
  | 'friend_referred';

export interface RecipeAddedMeta {
  name: string;
  has_ingredients: boolean;
  instructions_len: number;
  has_photo?: boolean;
  source_url?: string;
  imported: boolean;
}

export interface RecipeCookedMeta {
  cuisine?: string;
  ingredient_ids?: number[];
  tags?: string[];
  category?: string;
}

export interface RatingLeftMeta {
  review_len: number;
}

export interface AIQueryMeta {
  question_len?: number;
  meaningful?: boolean;
}

export interface RecipeAddedToOtherUserMeta {
  original_owner_id: string;
}

export interface FriendReferredMeta {
  referred_user_id: string;
  referral_method?: string; // 'invite_link', 'direct_share', etc.
}

export type EventMeta =
  | RecipeAddedMeta
  | RecipeCookedMeta
  | RatingLeftMeta
  | AIQueryMeta
  | RecipeAddedToOtherUserMeta
  | FriendReferredMeta
  | Record<string, any>;

export interface BadgeAward {
  badge_code: string;
  tier: number;
  label: string;
  newly_awarded: boolean;
  upgraded: boolean;
}

export interface LogEventResult {
  event_id: number;
  awards: BadgeAward[];
}

export interface Badge {
  badge_code: string;
  display_name: string;
  description: string;
  icon: string;
  family: string | null;
}

export interface BadgeTier {
  badge_code: string;
  tier: number;
  label: string;
  threshold: number;
}

export interface UserBadge {
  badge_code: string;
  current_tier: number;
  awarded_at: string;
  updated_at: string;
}

export interface BadgeProgress {
  recipe_maker: number;
  curator: number;
  list_legend: number;
  conversion_wizard: number;
  chef_tony_apprentice: number;
  cuisine_explorer: number;
  friends_referred: number;
}

// ==========================================
// EVENT LOGGING
// ==========================================

/**
 * Log a user event and immediately check for badge awards
 * @returns New badge awards (if any) and the event ID
 */
export async function logEventAndAward(
  type: UserEventType,
  meta: EventMeta = {},
  recipeId?: number,
  otherUserId?: string
): Promise<LogEventResult | null> {

  try {
    const { data, error } = await supabase.rpc('log_event_and_award', {
      p_type: type,
      p_recipe_id: recipeId || null,
      p_other_user_id: otherUserId || null,
      p_meta: meta,
    });

    if (error) {
      console.error('Error logging event:', error);
      return null;
    }

    return data as LogEventResult;
  } catch (err) {
    console.error('Exception logging event:', err);
    return null;
  }
}

/**
 * Log a user event without checking for awards (lighter operation)
 * @returns Event ID
 */
export async function logEvent(
  type: UserEventType,
  meta: EventMeta = {},
  recipeId?: number,
  otherUserId?: string
): Promise<number | null> {

  try {
    const { data, error } = await supabase.rpc('log_event', {
      p_type: type,
      p_recipe_id: recipeId || null,
      p_other_user_id: otherUserId || null,
      p_meta: meta,
    });

    if (error) {
      console.error('Error logging event:', error);
      return null;
    }

    return data as number;
  } catch (err) {
    console.error('Exception logging event:', err);
    return null;
  }
}

// ==========================================
// BADGE QUERIES
// ==========================================

/**
 * Fetch all available badges
 */
export async function getBadges(): Promise<Badge[]> {

  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('badge_code');

  if (error) {
    console.error('Error fetching badges:', error);
    return [];
  }

  return data as Badge[];
}

/**
 * Fetch all badge tiers
 */
export async function getBadgeTiers(): Promise<BadgeTier[]> {

  const { data, error } = await supabase
    .from('badge_tiers')
    .select('*')
    .order('badge_code, tier');

  if (error) {
    console.error('Error fetching badge tiers:', error);
    return [];
  }

  return data as BadgeTier[];
}

/**
 * Fetch user's earned badges
 */
export async function getUserBadges(userId?: string): Promise<UserBadge[]> {

  let query = supabase
    .from('user_badges')
    .select('*')
    .order('awarded_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }

  return data as UserBadge[];
}

/**
 * Get badge progress counts
 */
export async function getBadgeProgress(userId?: string): Promise<BadgeProgress | null> {

  try {
    const { data, error } = await supabase.rpc('get_badge_progress', {
      p_user_id: userId || null,
    });

    if (error) {
      console.error('Error fetching badge progress:', error);
      return null;
    }

    return data as BadgeProgress;
  } catch (err) {
    console.error('Exception fetching badge progress:', err);
    return null;
  }
}

/**
 * Manually trigger badge award calculation for current user
 * (Useful after backfilling or bulk operations)
 */
export async function awardBadgesForUser(userId?: string): Promise<BadgeAward[]> {

  try {
    const { data, error } = await supabase.rpc('award_badges_for_user', {
      p_user_id: userId || null,
    });

    if (error) {
      console.error('Error awarding badges:', error);
      return [];
    }

    return data as BadgeAward[];
  } catch (err) {
    console.error('Exception awarding badges:', err);
    return [];
  }
}

/**
 * Get user's compact badge data from profiles.badges
 */
export async function getProfileBadges(userId: string): Promise<any[]> {

  const { data, error } = await supabase
    .from('profiles')
    .select('badges')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile badges:', error);
    return [];
  }

  return (data?.badges as any[]) || [];
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate progress percentage to next tier
 */
export function calculateProgress(
  currentValue: number,
  currentTierThreshold: number,
  nextTierThreshold: number | null
): number {
  if (!nextTierThreshold) {
    return 100; // Already at max tier
  }

  const range = nextTierThreshold - currentTierThreshold;
  const progress = currentValue - currentTierThreshold;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

/**
 * Get the next tier for a badge
 */
export function getNextTier(
  badgeCode: string,
  currentTier: number | null,
  allTiers: BadgeTier[]
): BadgeTier | null {
  const nextTierNum = (currentTier || 0) + 1;
  return allTiers.find((t) => t.badge_code === badgeCode && t.tier === nextTierNum) || null;
}

/**
 * Get the current tier info
 */
export function getCurrentTier(
  badgeCode: string,
  currentTier: number,
  allTiers: BadgeTier[]
): BadgeTier | null {
  return allTiers.find((t) => t.badge_code === badgeCode && t.tier === currentTier) || null;
}

/**
 * Format tier label with emoji
 */
export function formatTierLabel(label: string): string {
  const tierEmojis: Record<string, string> = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
    Platinum: '💎',
    Diamond: '💎',
  };

  return tierEmojis[label] ? `${tierEmojis[label]} ${label}` : label;
}

