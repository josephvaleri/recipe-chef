-- =====================================================
-- Run All Badge System Migrations
-- =====================================================
-- This file runs all badge system migrations in order.
-- Execute this in your Supabase SQL Editor.
-- Safe to run multiple times (all migrations are idempotent).

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
    'bug_report_confirmed'
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
  ('holiday_baker', 'Holiday Baker', 'Bake holiday desserts in December', 'cake', 'seasonal')
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
  ('holiday_baker', 1, 'Gold', 3)
ON CONFLICT (badge_code, tier) DO UPDATE SET label = EXCLUDED.label, threshold = EXCLUDED.threshold;

-- Continue with migrations 005, 006, 007...
-- (Due to length, see individual migration files)

DO $$ 
BEGIN 
  RAISE NOTICE '✓ Badge system core migrations completed';
  RAISE NOTICE '→ Now run migrations 005, 006, and 007 (see individual files for complete functions)';
END $$;

