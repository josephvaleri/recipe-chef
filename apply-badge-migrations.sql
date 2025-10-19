-- =====================================================
-- APPLY ALL BADGE SYSTEM MIGRATIONS
-- =====================================================
-- Run this script in your Supabase SQL Editor to deploy the complete badge system
-- Safe to run multiple times (all migrations are idempotent)

-- =====================================================
-- MIGRATION 001: Create Badge System Core
-- =====================================================

-- 1) Create enum for event types
DO $$ BEGIN
  CREATE TYPE public.user_event_type AS ENUM (
    'recipe_added',
    'recipe_cooked',
    'rating_left',
    'photo_uploaded',
    'calendar_added',
    'shopping_list_generated',
    'alexa_pushed',
    'ai_query',
    'ai_accept_result',
    'recipe_added_to_other_user',
    'recipe_accepted_global',
    'unit_conversion_used',
    'bug_report_confirmed',
    'friend_referred'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Create user_events table (append-only event log)
CREATE TABLE IF NOT EXISTS public.user_events (
  event_id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type public.user_event_type NOT NULL,
  recipe_id bigint NULL,
  other_user_id uuid NULL REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 3) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_user_type ON public.user_events(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_events_recipe_id ON public.user_events(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON public.user_events(type);

-- 4) Add badges JSON column to profiles (stores compact UI-friendly badge data)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN badges jsonb DEFAULT '[]'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 5) Create index on badges for querying
CREATE INDEX IF NOT EXISTS idx_profiles_badges ON public.profiles USING gin (badges);

-- =====================================================
-- MIGRATION 002: Valid Recipe Added View
-- =====================================================

CREATE OR REPLACE VIEW public.valid_recipe_added_events AS
WITH cooldown_filtered AS (
  SELECT 
    event_id,
    user_id,
    type,
    recipe_id,
    created_at,
    meta,
    LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) AS prev_created_at
  FROM public.user_events
  WHERE type = 'recipe_added'
)
SELECT 
  event_id,
  user_id,
  recipe_id,
  created_at,
  meta
FROM cooldown_filtered
WHERE 
  (meta->>'name' IS NOT NULL AND meta->>'name' != '')
  AND (meta->>'has_ingredients')::boolean = true
  AND (
    (meta->>'has_photo')::boolean = true
    OR (meta->>'source_url' IS NOT NULL AND meta->>'source_url' != '')
    OR (COALESCE((meta->>'instructions_len')::int, 0) >= 150)
  )
  AND (
    prev_created_at IS NULL 
    OR created_at > prev_created_at + INTERVAL '5 minutes'
  );

-- =====================================================
-- MIGRATION 003: Badge Catalog Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS public.badges (
  badge_code text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  family text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.badge_tiers (
  badge_code text NOT NULL REFERENCES public.badges(badge_code) ON DELETE CASCADE,
  tier int NOT NULL CHECK (tier > 0),
  label text NOT NULL,
  threshold int NOT NULL CHECK (threshold > 0),
  PRIMARY KEY (badge_code, tier)
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES public.badges(badge_code) ON DELETE CASCADE,
  current_tier int NOT NULL CHECK (current_tier > 0),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_code ON public.user_badges(badge_code);
CREATE INDEX IF NOT EXISTS idx_badge_tiers_badge_code ON public.badge_tiers(badge_code);

-- =====================================================
-- MIGRATION 004: Seed Badges and Tiers
-- =====================================================

-- Insert badges
INSERT INTO public.badges (badge_code, display_name, description, icon, family) VALUES
  ('recipe_maker', 'Recipe Maker', 'Add recipes to your cookbook', 'chef-hat', 'cooking'),
  ('cuisine_explorer', 'Cuisine Explorer', 'Cook recipes from different cuisines', 'globe', 'cooking'),
  ('curator', 'Curator', 'Collect recipes in your cookbook', 'book-marked', 'collecting'),
  ('top_rated_chef', 'Top Rated Chef', 'Maintain highly rated recipes (avg ≥4.5★)', 'crown', 'quality'),
  ('recipe_judge', 'Recipe Judge', 'Leave thoughtful reviews', 'star', 'community'),
  ('originals_only', 'Original Creator', 'Add original (non-imported) recipes', 'sparkles', 'creativity'),
  ('crowd_favorite', 'Crowd Favorite', 'Have your recipes added by other users', 'heart', 'community'),
  ('monthly_meal_master', 'Monthly Meal Master', 'Plan meals on your calendar', 'calendar', 'planning'),
  ('regional_specialist', 'Regional Specialist', 'Master recipes from a single cuisine', 'flame', 'expertise'),
  ('ingredient_adventurer', 'Ingredient Adventurer', 'Cook with diverse ingredients', 'list', 'exploration'),
  ('list_legend', 'List Legend', 'Generate shopping lists', 'shopping-cart', 'planning'),
  ('alexa_ally', 'Alexa Ally', 'Push recipes to Alexa', 'mic', 'technology'),
  ('bug_bounty', 'Bug Hunter', 'Report confirmed bugs', 'bug', 'community'),
  ('chef_tony_apprentice', 'Chef Tony Apprentice', 'Ask meaningful AI questions', 'brain', 'ai'),
  ('conversion_wizard', 'Conversion Wizard', 'Use unit conversions', 'calculator', 'tools'),
  ('holiday_baker', 'Holiday Baker', 'Bake holiday desserts in December', 'cake', 'seasonal'),
  ('friends_referred', 'Friend Referrer', 'Refer friends to Recipe Chef', 'user-plus', 'community')
ON CONFLICT (badge_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  family = EXCLUDED.family;

-- Insert badge tiers
INSERT INTO public.badge_tiers (badge_code, tier, label, threshold) VALUES
  ('recipe_maker', 1, 'Bronze', 25), ('recipe_maker', 2, 'Silver', 50),
  ('recipe_maker', 3, 'Gold', 100), ('recipe_maker', 4, 'Platinum', 250),
  ('cuisine_explorer', 1, 'Bronze', 3), ('cuisine_explorer', 2, 'Silver', 5),
  ('cuisine_explorer', 3, 'Gold', 7), ('cuisine_explorer', 4, 'Platinum', 10),
  ('curator', 1, 'Bronze', 5), ('curator', 2, 'Silver', 10),
  ('curator', 3, 'Gold', 25), ('curator', 4, 'Platinum', 50), ('curator', 5, 'Diamond', 100),
  ('top_rated_chef', 1, 'Bronze', 3), ('top_rated_chef', 2, 'Silver', 10), ('top_rated_chef', 3, 'Gold', 25),
  ('recipe_judge', 1, 'Bronze', 10), ('recipe_judge', 2, 'Silver', 30), ('recipe_judge', 3, 'Gold', 100),
  ('originals_only', 1, 'Bronze', 5), ('originals_only', 2, 'Silver', 20), ('originals_only', 3, 'Gold', 50),
  ('crowd_favorite', 1, 'Bronze', 25), ('crowd_favorite', 2, 'Silver', 100), ('crowd_favorite', 3, 'Gold', 500),
  ('monthly_meal_master', 1, 'Bronze', 5), ('monthly_meal_master', 2, 'Silver', 10), ('monthly_meal_master', 3, 'Gold', 15),
  ('regional_specialist', 1, 'Bronze', 10), ('regional_specialist', 2, 'Silver', 25), ('regional_specialist', 3, 'Gold', 50),
  ('ingredient_adventurer', 1, 'Bronze', 50), ('ingredient_adventurer', 2, 'Silver', 100), ('ingredient_adventurer', 3, 'Gold', 200),
  ('list_legend', 1, 'Bronze', 5), ('list_legend', 2, 'Silver', 20), ('list_legend', 3, 'Gold', 50),
  ('alexa_ally', 1, 'Bronze', 3), ('alexa_ally', 2, 'Silver', 10), ('alexa_ally', 3, 'Gold', 25),
  ('bug_bounty', 1, 'Bronze', 1), ('bug_bounty', 2, 'Silver', 3), ('bug_bounty', 3, 'Gold', 10),
  ('chef_tony_apprentice', 1, 'Bronze', 10), ('chef_tony_apprentice', 2, 'Silver', 30), ('chef_tony_apprentice', 3, 'Gold', 100),
  ('conversion_wizard', 1, 'Bronze', 10), ('conversion_wizard', 2, 'Silver', 30), ('conversion_wizard', 3, 'Gold', 100),
  ('holiday_baker', 1, 'Gold', 3),
  ('friends_referred', 1, 'Bronze', 1), ('friends_referred', 2, 'Silver', 3), ('friends_referred', 3, 'Gold', 5)
ON CONFLICT (badge_code, tier) DO UPDATE SET label = EXCLUDED.label, threshold = EXCLUDED.threshold;

-- =====================================================
-- MIGRATION 005: Badge Award Functions
-- =====================================================

-- Function: upsert_user_badge
CREATE OR REPLACE FUNCTION public.upsert_user_badge(
  p_user_id uuid,
  p_badge_code text,
  p_value int
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_best_tier int := NULL;
  v_current_tier int := NULL;
  v_tier_label text;
  v_result jsonb;
BEGIN
  -- Find the highest tier the user qualifies for
  SELECT tier INTO v_best_tier
  FROM public.badge_tiers
  WHERE badge_code = p_badge_code AND threshold <= p_value
  ORDER BY tier DESC
  LIMIT 1;
  
  -- If no tier earned, return NULL
  IF v_best_tier IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check current tier (if any)
  SELECT current_tier INTO v_current_tier
  FROM public.user_badges
  WHERE user_id = p_user_id AND badge_code = p_badge_code;
  
  -- Only update if improved (higher tier) or new badge
  IF v_current_tier IS NULL OR v_best_tier > v_current_tier THEN
    -- Get tier label
    SELECT label INTO v_tier_label
    FROM public.badge_tiers
    WHERE badge_code = p_badge_code AND tier = v_best_tier;
    
    -- Upsert the badge
    INSERT INTO public.user_badges (user_id, badge_code, current_tier, awarded_at, updated_at)
    VALUES (p_user_id, p_badge_code, v_best_tier, now(), now())
    ON CONFLICT (user_id, badge_code) 
    DO UPDATE SET 
      current_tier = v_best_tier,
      updated_at = now();
    
    -- Return the new badge award
    v_result := jsonb_build_object(
      'badge_code', p_badge_code,
      'tier', v_best_tier,
      'label', v_tier_label,
      'newly_awarded', (v_current_tier IS NULL),
      'upgraded', (v_current_tier IS NOT NULL AND v_best_tier > v_current_tier)
    );
    
    RETURN v_result;
  END IF;
  
  -- No improvement, return NULL
  RETURN NULL;
END;
$$;

-- Function: award_badges_for_user
CREATE OR REPLACE FUNCTION public.award_badges_for_user(
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_awards jsonb := '[]'::jsonb;
  v_award jsonb;
  v_count int;
  v_distinct_count int;
  v_max_cuisine_count int;
  v_current_month_start date;
  v_ingredient_ids jsonb;
  v_distinct_ingredients int;
BEGIN
  v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
  
  -- BADGE: recipe_maker (total valid recipes added)
  SELECT COUNT(*) INTO v_count
  FROM public.valid_recipe_added_events
  WHERE user_id = p_user_id;
  
  v_award := public.upsert_user_badge(p_user_id, 'recipe_maker', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: cuisine_explorer (distinct cuisines cooked)
  SELECT COUNT(DISTINCT meta->>'cuisine') INTO v_distinct_count
  FROM public.user_events
  WHERE user_id = p_user_id 
    AND type = 'recipe_cooked'
    AND meta->>'cuisine' IS NOT NULL
    AND meta->>'cuisine' != '';
  
  v_award := public.upsert_user_badge(p_user_id, 'cuisine_explorer', v_distinct_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: curator (total recipes in cookbook)
  SELECT COUNT(*) INTO v_count
  FROM public.user_recipes
  WHERE user_id = p_user_id;
  
  v_award := public.upsert_user_badge(p_user_id, 'curator', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: top_rated_chef (recipes with avg rating ≥4.5)
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT ur.user_recipe_id
    FROM public.user_recipes ur
    LEFT JOIN public.ratings r ON r.recipe_scope = 'user' AND r.recipe_key = ur.user_recipe_id
    WHERE ur.user_id = p_user_id
    GROUP BY ur.user_recipe_id
    HAVING COUNT(r.score) > 0 AND AVG(r.score) >= 4.5
  ) subq;
  
  v_award := public.upsert_user_badge(p_user_id, 'top_rated_chef', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: recipe_judge (thoughtful reviews ≥20 chars)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id 
    AND type = 'rating_left'
    AND COALESCE((meta->>'review_len')::int, 0) >= 20;
  
  v_award := public.upsert_user_badge(p_user_id, 'recipe_judge', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: originals_only (non-imported recipes)
  SELECT COUNT(*) INTO v_count
  FROM public.valid_recipe_added_events
  WHERE user_id = p_user_id
    AND (meta->>'imported')::boolean = false;
  
  v_award := public.upsert_user_badge(p_user_id, 'originals_only', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: crowd_favorite (recipes added by others)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE type = 'recipe_added_to_other_user'
    AND (meta->>'original_owner_id')::uuid = p_user_id;
  
  v_award := public.upsert_user_badge(p_user_id, 'crowd_favorite', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: monthly_meal_master (calendar adds this month)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id
    AND type = 'calendar_added'
    AND created_at >= v_current_month_start;
  
  v_award := public.upsert_user_badge(p_user_id, 'monthly_meal_master', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: regional_specialist (most recipes in single cuisine)
  SELECT COALESCE(MAX(cuisine_count), 0) INTO v_max_cuisine_count
  FROM (
    SELECT meta->>'cuisine' AS cuisine, COUNT(*) AS cuisine_count
    FROM public.user_events
    WHERE user_id = p_user_id 
      AND type = 'recipe_cooked'
      AND meta->>'cuisine' IS NOT NULL
      AND meta->>'cuisine' != ''
    GROUP BY meta->>'cuisine'
  ) cuisine_counts;
  
  v_award := public.upsert_user_badge(p_user_id, 'regional_specialist', v_max_cuisine_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: ingredient_adventurer (distinct ingredients cooked)
  SELECT COUNT(DISTINCT ingredient_id) INTO v_distinct_ingredients
  FROM (
    SELECT jsonb_array_elements_text(meta->'ingredient_ids')::int AS ingredient_id
    FROM public.user_events
    WHERE user_id = p_user_id 
      AND type = 'recipe_cooked'
      AND meta ? 'ingredient_ids'
  ) ingredient_list;
  
  v_award := public.upsert_user_badge(p_user_id, 'ingredient_adventurer', COALESCE(v_distinct_ingredients, 0));
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: list_legend (shopping lists generated)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'shopping_list_generated';
  
  v_award := public.upsert_user_badge(p_user_id, 'list_legend', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: alexa_ally (Alexa pushes)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'alexa_pushed';
  
  v_award := public.upsert_user_badge(p_user_id, 'alexa_ally', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: bug_bounty (confirmed bug reports)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'bug_report_confirmed';
  
  v_award := public.upsert_user_badge(p_user_id, 'bug_bounty', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: chef_tony_apprentice (meaningful AI queries)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id 
    AND type = 'ai_query'
    AND (
      COALESCE((meta->>'question_len')::int, 0) >= 20
      OR (meta->>'meaningful')::boolean = true
    );
  
  v_award := public.upsert_user_badge(p_user_id, 'chef_tony_apprentice', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: conversion_wizard (unit conversions)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'unit_conversion_used';
  
  v_award := public.upsert_user_badge(p_user_id, 'conversion_wizard', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: holiday_baker (3 holiday desserts in December)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id 
    AND type = 'recipe_cooked'
    AND EXTRACT(MONTH FROM created_at) = 12
    AND (
      (meta->>'category' ILIKE '%dessert%')
      OR (meta->'tags' ? 'dessert')
      OR (meta->'tags' ? 'holiday')
      OR (meta->'tags' ? 'christmas')
      OR (meta->'tags' ? 'baking')
    );
  
  v_award := public.upsert_user_badge(p_user_id, 'holiday_baker', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- BADGE: friends_referred (refer friends)
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'friend_referred';
  
  v_award := public.upsert_user_badge(p_user_id, 'friends_referred', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- SYNC: Update profiles.badges with compact JSON
  UPDATE public.profiles
  SET badges = (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'badge_code', ub.badge_code,
        'tier', ub.current_tier,
        'label', bt.label,
        'awarded_at', ub.awarded_at
      ) ORDER BY ub.awarded_at DESC
    ), '[]'::jsonb)
    FROM public.user_badges ub
    JOIN public.badge_tiers bt ON bt.badge_code = ub.badge_code AND bt.tier = ub.current_tier
    WHERE ub.user_id = p_user_id
  )
  WHERE user_id = p_user_id;
  
  -- Return all new/upgraded awards
  RETURN v_awards;
END;
$$;

-- Function: award_badges_for_all_users
CREATE OR REPLACE FUNCTION public.award_badges_for_all_users()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record RECORD;
BEGIN
  FOR v_user_record IN 
    SELECT user_id FROM public.profiles
  LOOP
    PERFORM public.award_badges_for_user(v_user_record.user_id);
  END LOOP;
END;
$$;

-- =====================================================
-- MIGRATION 006: Badge RPCs (SECURITY DEFINER)
-- =====================================================

-- RPC: log_event
CREATE OR REPLACE FUNCTION public.log_event(
  p_type public.user_event_type,
  p_recipe_id bigint DEFAULT NULL,
  p_other_user_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_event_id bigint;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Insert event
  INSERT INTO public.user_events (user_id, type, recipe_id, other_user_id, meta)
  VALUES (v_user_id, p_type, p_recipe_id, p_other_user_id, p_meta)
  RETURNING event_id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- RPC: log_event_and_award
CREATE OR REPLACE FUNCTION public.log_event_and_award(
  p_type public.user_event_type,
  p_recipe_id bigint DEFAULT NULL,
  p_other_user_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_event_id bigint;
  v_awards jsonb;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Insert event
  INSERT INTO public.user_events (user_id, type, recipe_id, other_user_id, meta)
  VALUES (v_user_id, p_type, p_recipe_id, p_other_user_id, p_meta)
  RETURNING event_id INTO v_event_id;
  
  -- Award badges
  v_awards := public.award_badges_for_user(v_user_id);
  
  -- Return result with event_id and any new awards
  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'awards', v_awards
  );
END;
$$;

-- RPC: get_badge_progress
CREATE OR REPLACE FUNCTION public.get_badge_progress(
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_progress jsonb := '{}'::jsonb;
  v_recipe_maker_count int;
  v_curator_count int;
  v_list_legend_count int;
  v_conversion_count int;
  v_ai_query_count int;
  v_cuisine_explorer_count int;
  v_friends_referred_count int;
BEGIN
  -- Get user (use parameter or auth.uid())
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Calculate current counts for major badges
  SELECT COUNT(*) INTO v_recipe_maker_count
  FROM public.valid_recipe_added_events WHERE user_id = v_user_id;
  
  SELECT COUNT(*) INTO v_curator_count
  FROM public.user_recipes WHERE user_id = v_user_id;
  
  SELECT COUNT(*) INTO v_list_legend_count
  FROM public.user_events WHERE user_id = v_user_id AND type = 'shopping_list_generated';
  
  SELECT COUNT(*) INTO v_conversion_count
  FROM public.user_events WHERE user_id = v_user_id AND type = 'unit_conversion_used';
  
  SELECT COUNT(*) INTO v_ai_query_count
  FROM public.user_events 
  WHERE user_id = v_user_id 
    AND type = 'ai_query'
    AND (
      COALESCE((meta->>'question_len')::int, 0) >= 20
      OR (meta->>'meaningful')::boolean = true
    );
  
  SELECT COUNT(DISTINCT meta->>'cuisine') INTO v_cuisine_explorer_count
  FROM public.user_events
  WHERE user_id = v_user_id 
    AND type = 'recipe_cooked'
    AND meta->>'cuisine' IS NOT NULL;
  
  SELECT COUNT(*) INTO v_friends_referred_count
  FROM public.user_events WHERE user_id = v_user_id AND type = 'friend_referred';
  
  -- Build progress object
  v_progress := jsonb_build_object(
    'recipe_maker', v_recipe_maker_count,
    'curator', v_curator_count,
    'list_legend', v_list_legend_count,
    'conversion_wizard', v_conversion_count,
    'chef_tony_apprentice', v_ai_query_count,
    'cuisine_explorer', v_cuisine_explorer_count,
    'friends_referred', v_friends_referred_count
  );
  
  RETURN v_progress;
END;
$$;

-- =====================================================
-- MIGRATION 007: Enable RLS and Grant Permissions
-- =====================================================

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert own events" ON public.user_events;
DROP POLICY IF EXISTS "Users can view own events" ON public.user_events;
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
DROP POLICY IF EXISTS "System can manage badges" ON public.user_badges;
DROP POLICY IF EXISTS "Anyone can view badge catalog" ON public.badges;
DROP POLICY IF EXISTS "Admins can manage badge catalog" ON public.badges;
DROP POLICY IF EXISTS "Anyone can view badge tiers" ON public.badge_tiers;
DROP POLICY IF EXISTS "Admins can manage badge tiers" ON public.badge_tiers;

-- RLS POLICIES: user_events
CREATE POLICY "Users can insert own events" 
  ON public.user_events
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own events" 
  ON public.user_events
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- RLS POLICIES: user_badges
CREATE POLICY "Users can view own badges" 
  ON public.user_badges
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage badges" 
  ON public.user_badges
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS POLICIES: badges (catalog - read-only)
CREATE POLICY "Anyone can view badge catalog" 
  ON public.badges
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage badge catalog" 
  ON public.badges
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS POLICIES: badge_tiers (catalog - read-only)
CREATE POLICY "Anyone can view badge tiers" 
  ON public.badge_tiers
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage badge tiers" 
  ON public.badge_tiers
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Grant permissions
GRANT SELECT ON public.user_events TO authenticated;
GRANT SELECT ON public.user_badges TO authenticated;
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT ON public.badge_tiers TO authenticated;
GRANT SELECT ON public.valid_recipe_added_events TO authenticated;
GRANT INSERT ON public.user_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event_and_award TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_badge_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badges_for_all_users TO authenticated;
GRANT USAGE ON SEQUENCE public.user_events_event_id_seq TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Badge system deployed successfully!';
  RAISE NOTICE '📊 Tables created: user_events, badges, badge_tiers, user_badges';
  RAISE NOTICE '🔧 Functions created: log_event, log_event_and_award, get_badge_progress, award_badges_for_user';
  RAISE NOTICE '🛡️ RLS policies and permissions configured';
  RAISE NOTICE '🎯 Ready to award badges!';
END $$;
