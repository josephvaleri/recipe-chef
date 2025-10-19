-- =====================================================
-- Migration: Add Friends Referred Badge
-- =====================================================
-- Adds the "Friends Referred" badge for Phase 2 Friends & Followers feature

-- Insert the Friends Referred badge
INSERT INTO public.badges (badge_code, display_name, description, icon, family) VALUES
  ('friends_referred', 'Friends Referred', 'Successfully refer friends to join Recipe Chef', 'user-plus', 'community')
ON CONFLICT (badge_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  family = EXCLUDED.family;

-- Insert badge tiers for Friends Referred: 3/5/10/15/20
INSERT INTO public.badge_tiers (badge_code, tier, label, threshold) VALUES
  ('friends_referred', 1, 'Bronze', 3),
  ('friends_referred', 2, 'Silver', 5),
  ('friends_referred', 3, 'Gold', 10),
  ('friends_referred', 4, 'Platinum', 15),
  ('friends_referred', 5, 'Diamond', 20)
ON CONFLICT (badge_code, tier) DO UPDATE SET
  label = EXCLUDED.label,
  threshold = EXCLUDED.threshold;

-- Add comment
COMMENT ON TABLE public.badge_tiers IS 'Friends Referred badge tracks successful friend referrals through the user_referrals table';
