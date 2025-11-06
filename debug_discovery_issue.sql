-- Debug why Near Me and Like Me aren't working
-- Run this to check your profile and nearby user data

-- Check your profile data
SELECT 
  'Your Profile Data:' as info,
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
WHERE user_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64';

-- Check the nearby user (Carole) data
SELECT 
  'Nearby User (Carole) Data:' as info,
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
WHERE user_id = '7793b874-88d7-42cf-8743-1dcab8ddf20e';

-- Test the people-like-you function directly
SELECT 
  'People Like You Results:' as info;
SELECT * FROM public.discover_people_like_you_v2(10);

-- Test the near-me function directly  
SELECT 
  'Near Me Results:' as info;
SELECT * FROM public.discover_near_me_v2(50);

-- Check if you have the required profile fields for matching
SELECT 
  'Profile Completeness Check:' as info,
  user_id,
  CASE 
    WHEN diet_type IS NULL THEN 'Missing diet_type'
    WHEN skill_level IS NULL THEN 'Missing skill_level' 
    WHEN favorite_cuisine IS NULL THEN 'Missing favorite_cuisine'
    ELSE 'All required fields present'
  END as status
FROM profiles 
WHERE user_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64';

-- Check if nearby user has required fields
SELECT 
  'Nearby User Completeness Check:' as info,
  user_id,
  CASE 
    WHEN diet_type IS NULL THEN 'Missing diet_type'
    WHEN skill_level IS NULL THEN 'Missing skill_level' 
    WHEN favorite_cuisine IS NULL THEN 'Missing favorite_cuisine'
    WHEN geo_opt_in = false THEN 'Location sharing disabled'
    WHEN lat IS NULL OR lng IS NULL THEN 'Missing location data'
    ELSE 'All required fields present'
  END as status
FROM profiles 
WHERE user_id = '7793b874-88d7-42cf-8743-1dcab8ddf20e';
