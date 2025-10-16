-- =====================================================
-- Migration: Badge RPCs (SECURITY DEFINER)
-- =====================================================
-- Creates safe RPC functions that clients can call

-- 1) RPC: log_event
-- Logs a user event (uses auth.uid() for security)
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

-- 2) RPC: log_event_and_award
-- Logs event and immediately awards badges
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

-- 3) RPC: admin_log_event_and_award (optional - for backfilling/testing)
-- Admin-only function to log events for any user
CREATE OR REPLACE FUNCTION public.admin_log_event_and_award(
  p_user_id uuid,
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
  v_caller_role text;
  v_event_id bigint;
  v_awards jsonb;
BEGIN
  -- Check if caller is admin
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF v_caller_role NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Insert event for specified user
  INSERT INTO public.user_events (user_id, type, recipe_id, other_user_id, meta)
  VALUES (p_user_id, p_type, p_recipe_id, p_other_user_id, p_meta)
  RETURNING event_id INTO v_event_id;
  
  -- Award badges
  v_awards := public.award_badges_for_user(p_user_id);
  
  -- Return result
  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'awards', v_awards
  );
END;
$$;

-- 4) RPC: get_badge_progress
-- Returns user's progress toward next tiers
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
  
  -- Build progress object
  v_progress := jsonb_build_object(
    'recipe_maker', v_recipe_maker_count,
    'curator', v_curator_count,
    'list_legend', v_list_legend_count,
    'conversion_wizard', v_conversion_count,
    'chef_tony_apprentice', v_ai_query_count,
    'cuisine_explorer', v_cuisine_explorer_count
  );
  
  RETURN v_progress;
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.log_event IS 'Client RPC: Log a user event (uses auth.uid())';
COMMENT ON FUNCTION public.log_event_and_award IS 'Client RPC: Log event and immediately award badges, returns new awards';
COMMENT ON FUNCTION public.admin_log_event_and_award IS 'Admin RPC: Log event for any user (requires admin role)';
COMMENT ON FUNCTION public.get_badge_progress IS 'Client RPC: Get current progress counts for badges';


