-- =====================================================
-- Migration: Add Friends Referred Badge Logic
-- =====================================================
-- Updates the award_badges_for_user function to include friends_referred badge calculation

-- Update the award_badges_for_user function to include friends_referred badge
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
  -- BADGE: friends_referred (successful friend referrals)
  -- ==========================================
  SELECT COUNT(*) INTO v_count
  FROM public.user_referrals
  WHERE referrer_id = p_user_id
    AND status = 'ACCEPTED';
  
  v_award := public.upsert_user_badge(p_user_id, 'friends_referred', v_count);
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

-- Add comment
COMMENT ON FUNCTION public.award_badges_for_user IS 'Calculates all badge progress for a user including friends_referred badge and syncs profiles.badges JSON';
