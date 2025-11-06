-- Test the My Feed API function with different parameter types
-- This will help us identify if there's a parameter mismatch

-- Step 1: Check the function signature
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters 
WHERE specific_schema = 'public' 
AND routine_name = 'get_my_feed'
ORDER BY ordinal_position;

-- Step 2: Test with a specific user ID (replace with actual user ID)
-- Get a user ID first
SELECT 'Available user IDs:' as info, user_id::text as user_id_text
FROM public.profiles 
ORDER BY created_at ASC 
LIMIT 3;

-- Step 3: Test the function with the user ID as text (like the API might be sending)
-- Replace 'USER_ID_HERE' with an actual user ID from above
SELECT 'Testing with text parameter:' as test_type, 
       event_id, kind, payload, created_at 
FROM public.get_my_feed('USER_ID_HERE'::text::uuid, 5);

-- Step 4: Test with the user ID as uuid directly
SELECT 'Testing with uuid parameter:' as test_type, 
       event_id, kind, payload, created_at 
FROM public.get_my_feed('USER_ID_HERE'::uuid, 5);

-- Step 5: Check if there are any events for this user
SELECT 'Events for user:' as info, COUNT(*) as event_count
FROM public.user_events 
WHERE user_id = 'USER_ID_HERE'::uuid;
