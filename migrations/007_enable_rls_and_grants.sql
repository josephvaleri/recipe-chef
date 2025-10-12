-- =====================================================
-- Migration: Enable RLS and Grant Permissions
-- =====================================================
-- Secures all badge tables with RLS and grants necessary permissions

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_tiers ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES: user_events
-- ==========================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert own events" ON public.user_events;
DROP POLICY IF EXISTS "Users can view own events" ON public.user_events;

-- Users can only insert their own events (enforced by RPC using auth.uid())
CREATE POLICY "Users can insert own events" 
  ON public.user_events
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can only view their own events
CREATE POLICY "Users can view own events" 
  ON public.user_events
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- RLS POLICIES: user_badges
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
DROP POLICY IF EXISTS "System can manage badges" ON public.user_badges;

-- Users can view their own badges
CREATE POLICY "Users can view own badges" 
  ON public.user_badges
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- System functions can manage badges (SECURITY DEFINER functions bypass RLS)
CREATE POLICY "System can manage badges" 
  ON public.user_badges
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- RLS POLICIES: badges (catalog - read-only)
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view badge catalog" ON public.badges;
DROP POLICY IF EXISTS "Admins can manage badge catalog" ON public.badges;

-- All authenticated users can view the badge catalog
CREATE POLICY "Anyone can view badge catalog" 
  ON public.badges
  FOR SELECT 
  TO authenticated
  USING (true);

-- Only admins can modify the catalog
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

-- ==========================================
-- RLS POLICIES: badge_tiers (catalog - read-only)
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view badge tiers" ON public.badge_tiers;
DROP POLICY IF EXISTS "Admins can manage badge tiers" ON public.badge_tiers;

-- All authenticated users can view badge tiers
CREATE POLICY "Anyone can view badge tiers" 
  ON public.badge_tiers
  FOR SELECT 
  TO authenticated
  USING (true);

-- Only admins can modify tiers
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

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================

-- Grant SELECT on tables
GRANT SELECT ON public.user_events TO authenticated;
GRANT SELECT ON public.user_badges TO authenticated;
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT ON public.badge_tiers TO authenticated;
GRANT SELECT ON public.valid_recipe_added_events TO authenticated;

-- Grant INSERT on user_events (controlled by RLS)
GRANT INSERT ON public.user_events TO authenticated;

-- Grant EXECUTE on RPCs
GRANT EXECUTE ON FUNCTION public.log_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event_and_award TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_event_and_award TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_badge_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badges_for_all_users TO authenticated;

-- Grant USAGE on sequences
GRANT USAGE ON SEQUENCE public.user_events_event_id_seq TO authenticated;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Badge system RLS policies and permissions configured successfully';
END $$;

