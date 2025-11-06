-- Quick test: Use the first available user ID
-- This will work immediately without needing to replace anything

-- Step 1: Get the first user ID and create a test event
DO $$
DECLARE
    v_user_id uuid;
    v_event_id bigint;
BEGIN
    -- Get the first user ID from profiles
    SELECT user_id INTO v_user_id 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found in profiles table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using user ID: %', v_user_id;
    
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
    
END $$;

-- Step 2: Check the event was created
SELECT 'Event created:' as status, event_id, user_id, type, meta, created_at 
FROM public.user_events 
WHERE type = 'earned_badge'
ORDER BY created_at DESC 
LIMIT 1;

-- Step 3: Test get_my_feed with the same user
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get the same user ID
    SELECT user_id INTO v_user_id 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    RAISE NOTICE 'Testing get_my_feed for user: %', v_user_id;
    
    -- Show the results
    PERFORM * FROM public.get_my_feed(v_user_id, 5);
    
END $$;

-- Step 4: Show the actual results
SELECT 'My Feed results:' as status, event_id, kind, payload, created_at 
FROM public.get_my_feed(
    (SELECT user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1), 
    5
);
