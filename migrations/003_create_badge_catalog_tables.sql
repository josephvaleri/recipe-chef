-- =====================================================
-- Migration: Badge Catalog Tables
-- =====================================================
-- Creates the badge catalog, tiers, and user_badges tables

-- 1) Badges catalog (defines available badges)
CREATE TABLE IF NOT EXISTS public.badges (
  badge_code text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL, -- Lucide icon name
  family text, -- Optional grouping (e.g., 'cooking', 'community', 'technology')
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Badge tiers (progressive thresholds for each badge)
CREATE TABLE IF NOT EXISTS public.badge_tiers (
  badge_code text NOT NULL REFERENCES public.badges(badge_code) ON DELETE CASCADE,
  tier int NOT NULL CHECK (tier > 0),
  label text NOT NULL, -- e.g., 'Bronze', 'Silver', 'Gold', 'Platinum'
  threshold int NOT NULL CHECK (threshold > 0),
  PRIMARY KEY (badge_code, tier)
);

-- 3) User badges (tracks highest tier earned per badge per user)
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES public.badges(badge_code) ON DELETE CASCADE,
  current_tier int NOT NULL CHECK (current_tier > 0),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

-- 4) Create indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_code ON public.user_badges(badge_code);
CREATE INDEX IF NOT EXISTS idx_badge_tiers_badge_code ON public.badge_tiers(badge_code);

-- 5) Add comments
COMMENT ON TABLE public.badges IS 'Catalog of available badges';
COMMENT ON TABLE public.badge_tiers IS 'Progressive tiers (Bronze, Silver, Gold, etc.) with thresholds for each badge';
COMMENT ON TABLE public.user_badges IS 'Tracks the highest tier earned for each badge per user';
COMMENT ON COLUMN public.badges.icon IS 'Lucide icon name (e.g., chef-hat, trophy, star)';
COMMENT ON COLUMN public.badge_tiers.threshold IS 'Minimum count required to earn this tier';


