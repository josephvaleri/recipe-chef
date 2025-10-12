-- =====================================================
-- Migration: Badge Award Functions
-- =====================================================
-- Creates the core functions for badge calculation and awarding

-- 1) Function: upsert_user_badge
-- Finds the best tier for a value and updates user_badges if improved
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

-- 2) Function: award_badges_for_user
-- Calculates all badge progress for a user and awards/upgrades as needed
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
  
  -- ==========================================
  -- BADGE: recipe_maker (total valid recipes added)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.valid_recipe_added_events
  WHERE user_id = p_user_id;
  
  v_award := public.upsert_user_badge(p_user_id, 'recipe_maker', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: cuisine_explorer (distinct cuisines cooked)
  -- ==========================================
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
  
  -- ==========================================
  -- BADGE: curator (total recipes in cookbook)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_recipes
  WHERE user_id = p_user_id;
  
  v_award := public.upsert_user_badge(p_user_id, 'curator', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: top_rated_chef (recipes with avg rating ≥4.5)
  -- ==========================================
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
  
  -- ==========================================
  -- BADGE: recipe_judge (thoughtful reviews ≥20 chars)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id 
    AND type = 'rating_left'
    AND COALESCE((meta->>'review_len')::int, 0) >= 20;
  
  v_award := public.upsert_user_badge(p_user_id, 'recipe_judge', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: originals_only (non-imported recipes)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.valid_recipe_added_events
  WHERE user_id = p_user_id
    AND (meta->>'imported')::boolean = false;
  
  v_award := public.upsert_user_badge(p_user_id, 'originals_only', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: crowd_favorite (recipes added by others)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE type = 'recipe_added_to_other_user'
    AND (meta->>'original_owner_id')::uuid = p_user_id;
  
  v_award := public.upsert_user_badge(p_user_id, 'crowd_favorite', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: monthly_meal_master (calendar adds this month)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id
    AND type = 'calendar_added'
    AND created_at >= v_current_month_start;
  
  v_award := public.upsert_user_badge(p_user_id, 'monthly_meal_master', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: regional_specialist (most recipes in single cuisine)
  -- ==========================================
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
  
  -- ==========================================
  -- BADGE: ingredient_adventurer (distinct ingredients cooked)
  -- ==========================================
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
  
  -- ==========================================
  -- BADGE: list_legend (shopping lists generated)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'shopping_list_generated';
  
  v_award := public.upsert_user_badge(p_user_id, 'list_legend', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: alexa_ally (Alexa pushes)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'alexa_pushed';
  
  v_award := public.upsert_user_badge(p_user_id, 'alexa_ally', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: bug_bounty (confirmed bug reports)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'bug_report_confirmed';
  
  v_award := public.upsert_user_badge(p_user_id, 'bug_bounty', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: chef_tony_apprentice (meaningful AI queries)
  -- ==========================================
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
  
  -- ==========================================
  -- BADGE: conversion_wizard (unit conversions)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_events
  WHERE user_id = p_user_id AND type = 'unit_conversion_used';
  
  v_award := public.upsert_user_badge(p_user_id, 'conversion_wizard', v_count);
  IF v_award IS NOT NULL THEN
    v_awards := v_awards || jsonb_build_array(v_award);
  END IF;
  
  -- ==========================================
  -- BADGE: holiday_baker (3 holiday desserts in December)
  -- ==========================================
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
  
  -- ==========================================
  -- SYNC: Update profiles.badges with compact JSON
  -- ==========================================
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

-- 3) Function: award_badges_for_all_users
-- Iterates all users and awards badges (for nightly/retroactive runs)
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

-- Add comments
COMMENT ON FUNCTION public.upsert_user_badge IS 'Calculates the best tier for a badge value and updates user_badges if improved';
COMMENT ON FUNCTION public.award_badges_for_user IS 'Calculates all badge progress for a user and syncs profiles.badges JSON';
COMMENT ON FUNCTION public.award_badges_for_all_users IS 'Awards badges for all users (for nightly/retroactive runs)';

