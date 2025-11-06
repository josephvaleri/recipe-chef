-- Test with a specific user ID (replace with an actual user ID from your database)
-- First, let's find a user ID to test with

-- Step 1: Find a user ID to test with
SELECT 'Available users:' as info, user_id, full_name, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Replace 'YOUR_USER_ID_HERE' with an actual user ID from the results above
-- For now, let's use a placeholder that will show the error
DO $$
DECLARE
    v_user_id uuid;
    v_event_id bigint;
BEGIN
    -- Replace this with an actual user ID from the query above
    v_user_id := 'YOUR_USER_ID_HERE'::uuid;
    
    -- Check if the user ID is valid
    IF v_user_id = 'YOUR_USER_ID_HERE'::uuid THEN
        RAISE NOTICE 'Please replace YOUR_USER_ID_HERE with an actual user ID from the profiles table above';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', v_user_id;
    
    -- Create a test earned_badge event
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'earned_badge',
        jsonb_build_object(
            'badge_code', 'test_badge',
            'badge_name', 'Test Badge',
            'tier', 1,
            'tier_label', 'Bronze',
            'newly_awarded', true
        )
    )
    RETURNING event_id INTO v_event_id;
    
    RAISE NOTICE 'Created earned_badge event with ID: %', v_event_id;
    
    -- Test get_my_feed with this user
    RAISE NOTICE 'Testing get_my_feed for this user...';
    
END $$;

-- Step 3: Check what get_my_feed returns for a specific user
-- Replace 'YOUR_USER_ID_HERE' with the same user ID
SELECT 'My Feed results for specific user:' as info, event_id, kind, payload, created_at 
FROM public.get_my_feed('YOUR_USER_ID_HERE'::uuid, 5);
