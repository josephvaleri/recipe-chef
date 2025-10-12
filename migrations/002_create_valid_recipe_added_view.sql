-- =====================================================
-- Migration: Anti-Gaming View for recipe_added Events
-- =====================================================
-- Creates a view that filters recipe_added events to prevent gaming the system

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
  -- Anti-gaming rules:
  -- 1) Must have name
  (meta->>'name' IS NOT NULL AND meta->>'name' != '')
  
  -- 2) Must have ingredients
  AND (meta->>'has_ingredients')::boolean = true
  
  -- 3) Must have at least one of: photo, source_url, or substantial instructions (≥150 chars)
  AND (
    (meta->>'has_photo')::boolean = true
    OR (meta->>'source_url' IS NOT NULL AND meta->>'source_url' != '')
    OR (COALESCE((meta->>'instructions_len')::int, 0) >= 150)
  )
  
  -- 4) Cooldown: at least 5 minutes since previous recipe_added event
  AND (
    prev_created_at IS NULL 
    OR created_at > prev_created_at + INTERVAL '5 minutes'
  );

COMMENT ON VIEW public.valid_recipe_added_events IS 'Filters recipe_added events to prevent gaming: requires name, ingredients, substantial content, and 5-minute cooldown between additions';

