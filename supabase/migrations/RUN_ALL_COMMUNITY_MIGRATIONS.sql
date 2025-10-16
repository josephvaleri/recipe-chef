-- Community Phase 1: Master Migration File
-- Run all community migrations in order

-- 1. Extend profiles table
\i 20250116000001_community_phase1_profiles_extend.sql

-- 2. Extend recipes table
\i 20250116000002_community_phase1_recipes_extend.sql

-- 3. Create groups core tables
\i 20250116000003_community_phase1_groups_core.sql

-- 4. Set up RLS policies
\i 20250116000004_community_phase1_rls_policies.sql

-- 5. Seed global groups
\i 20250116000005_community_phase1_seed_groups.sql

-- Verify the setup
select 'Community Phase 1 migrations completed successfully' as status;

-- Show summary
select 
  'profiles' as table_name, 
  count(*) as total_rows 
from public.profiles
union all
select 
  'groups' as table_name, 
  count(*) as total_rows 
from public.groups
union all
select 
  'group_members' as table_name, 
  count(*) as total_rows 
from public.group_members;
