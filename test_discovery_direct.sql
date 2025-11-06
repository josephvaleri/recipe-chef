-- Test the discovery functions directly with your user ID
-- This will show if the database functions work

-- Test People Like You function
SELECT 'Testing discover_people_like_you_v2:' as test_type;
SELECT * FROM public.discover_people_like_you_v2(10);

-- Test Near Me function  
SELECT 'Testing discover_near_me_v2:' as test_type;
SELECT * FROM public.discover_near_me_v2(50);

-- Check your profile data
SELECT 'Your profile data:' as test_type;
SELECT 
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
SELECT 'Nearby user (Carole) data:' as test_type;
SELECT 
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
