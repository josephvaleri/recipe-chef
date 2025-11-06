-- Test if the discovery database functions exist
SELECT 
  'Checking if discovery functions exist:' as test_type;

-- Check if the functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE specific_schema = 'public' 
  AND routine_name IN (
    'discover_people_like_you_v2',
    'search_profiles_v1', 
    'discover_near_me_v2',
    'can_view_profile',
    'safe_display_name'
  )
ORDER BY routine_name;

-- Test the functions with a sample user ID
-- Replace with your actual user ID
SELECT 'Testing discover_people_like_you_v2:' as test_type;
SELECT * FROM public.discover_people_like_you_v2(5);

SELECT 'Testing search_profiles_v1:' as test_type;  
SELECT * FROM public.search_profiles_v1('test', 5);

SELECT 'Testing discover_near_me_v2:' as test_type;
SELECT * FROM public.discover_near_me_v2(50);

-- Check if the helper functions exist
SELECT 'Testing can_view_profile:' as test_type;
SELECT public.can_view_profile('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'::uuid, '7793b874-88d7-42cf-8743-1dcab8ddf20e'::uuid);

SELECT 'Testing safe_display_name:' as test_type;
SELECT public.safe_display_name('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'::uuid, '7793b874-88d7-42cf-8743-1dcab8ddf20e'::uuid, 'Anonymous');
