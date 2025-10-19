-- Fix Discovery Feature Issues
-- This script addresses the root causes of empty results

-- Step 1: Check current user profile completeness
SELECT 
  'Current User Profile Check:' as step,
  user_id,
  display_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  CASE 
    WHEN diet_type IS NULL THEN 'Missing diet_type'
    WHEN skill_level IS NULL THEN 'Missing skill_level' 
    WHEN favorite_cuisine IS NULL THEN 'Missing favorite_cuisine'
    WHEN geo_opt_in = false THEN 'Location sharing disabled'
    WHEN lat IS NULL OR lng IS NULL THEN 'Missing location data'
    ELSE 'Profile complete'
  END as status
FROM profiles 
WHERE user_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64';

-- Step 2: Check nearby user (Carole) profile completeness
SELECT 
  'Nearby User (Carole) Profile Check:' as step,
  user_id,
  display_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  CASE 
    WHEN diet_type IS NULL THEN 'Missing diet_type'
    WHEN skill_level IS NULL THEN 'Missing skill_level' 
    WHEN favorite_cuisine IS NULL THEN 'Missing favorite_cuisine'
    WHEN geo_opt_in = false THEN 'Location sharing disabled'
    WHEN lat IS NULL OR lng IS NULL THEN 'Missing location data'
    ELSE 'Profile complete'
  END as status
FROM profiles 
WHERE user_id = '7793b874-88d7-42cf-8743-1dcab8ddf20e';

-- Step 3: Fix current user profile if missing data
-- Update with sample data if fields are NULL
UPDATE profiles 
SET 
  diet_type = COALESCE(diet_type, 'vegetarian'),
  skill_level = COALESCE(skill_level, 'home_cook'),
  favorite_cuisine = COALESCE(favorite_cuisine, 'italian'),
  geo_opt_in = COALESCE(geo_opt_in, true),
  lat = COALESCE(lat, 37.7749),
  lng = COALESCE(lng, -122.4194),
  visibility = COALESCE(visibility, 'ANYONE'::user_visibility)
WHERE user_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'
  AND (diet_type IS NULL OR skill_level IS NULL OR favorite_cuisine IS NULL 
       OR geo_opt_in IS NULL OR lat IS NULL OR lng IS NULL OR visibility IS NULL);

-- Step 4: Fix nearby user (Carole) profile if missing data
UPDATE profiles 
SET 
  diet_type = COALESCE(diet_type, 'vegetarian'),
  skill_level = COALESCE(skill_level, 'home_cook'),
  favorite_cuisine = COALESCE(favorite_cuisine, 'italian'),
  geo_opt_in = COALESCE(geo_opt_in, true),
  lat = COALESCE(lat, 37.7750),
  lng = COALESCE(lng, -122.4195),
  visibility = COALESCE(visibility, 'ANYONE'::user_visibility)
WHERE user_id = '7793b874-88d7-42cf-8743-1dcab8ddf20e'
  AND (diet_type IS NULL OR skill_level IS NULL OR favorite_cuisine IS NULL 
       OR geo_opt_in IS NULL OR lat IS NULL OR lng IS NULL OR visibility IS NULL);

-- Step 5: Create additional test users for better testing
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES 
  -- Perfect match for "Like Me"
  ('test-user-1', 'TestChef1', 'Test Chef One', 'vegetarian', 'home_cook', 'italian',
   true, 37.7749, -122.4194, 'ANYONE', now(), now()),
  -- Perfect match for "Like Me" + nearby
  ('test-user-2', 'TestChef2', 'Test Chef Two', 'vegetarian', 'home_cook', 'italian',
   true, 37.7750, -122.4195, 'ANYONE', now(), now()),
  -- 2/3 match for "Like Me"
  ('test-user-3', 'TestChef3', 'Test Chef Three', 'vegetarian', 'beginner', 'italian',
   true, 37.7748, -122.4193, 'ANYONE', now(), now()),
  -- Nearby but different preferences
  ('test-user-4', 'TestChef4', 'Test Chef Four', 'vegan', 'advanced', 'mexican',
   true, 37.7751, -122.4196, 'ANYONE', now(), now())
ON CONFLICT (user_id) DO UPDATE SET
  diet_type = EXCLUDED.diet_type,
  skill_level = EXCLUDED.skill_level,
  favorite_cuisine = EXCLUDED.favorite_cuisine,
  geo_opt_in = EXCLUDED.geo_opt_in,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  visibility = EXCLUDED.visibility,
  updated_at = now();

-- Step 6: Test the functions directly (these will work when run as the authenticated user)
-- Note: These need to be run in the context of the authenticated user session

-- Step 7: Verify profile data after fixes
SELECT 
  'Profile Data After Fixes:' as step,
  user_id,
  display_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility
FROM profiles 
WHERE user_id IN (
  '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64',
  '7793b874-88d7-42cf-8743-1dcab8ddf20e',
  'test-user-1',
  'test-user-2',
  'test-user-3',
  'test-user-4'
)
ORDER BY user_id;

-- Step 8: Check if functions exist and are accessible
SELECT 
  'Function Existence Check:' as step,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE specific_schema = 'public' 
  AND routine_name IN (
    'discover_people_like_you_v2',
    'discover_near_me_v2',
    'can_view_profile',
    'safe_display_name'
  )
ORDER BY routine_name;
