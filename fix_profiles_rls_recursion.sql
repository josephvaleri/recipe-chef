-- Fix infinite recursion in profiles RLS policies
-- This script removes the problematic admin policy that causes infinite recursion

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- The remaining policies are safe:
-- 1. "Users can view own profile" - only checks auth.uid() = user_id (no recursion)
-- 2. "Users can update own profile" - only checks auth.uid() = user_id (no recursion)

-- Note: Admin functionality will need to be handled through service role or direct database access
-- This is actually more secure as it prevents privilege escalation through RLS policies

-- Verify the fix by checking current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
