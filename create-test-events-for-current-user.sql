-- Create test events for the current authenticated user
-- This will help us test if the issue is that the current user has no events

-- First, let's see what users exist and get their IDs
SELECT 'Available users:' as info, user_id, full_name, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Now let's create test events for the first user (you can replace with your actual user ID)
DO $$
DECLARE
    v_user_id uuid;
    v_event_id bigint;
BEGIN
    -- Get the first user ID (replace with your actual user ID if needed)
    SELECT user_id INTO v_user_id 
    FROM public.profiles 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found in profiles table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating test events for user: %', v_user_id;
    
    -- Create a test earned_badge event
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'earned_badge',
        jsonb_build_object(
            'badge_code', 'recipe_maker',
            'badge_name', 'Recipe Maker',
            'tier', 1,
            'tier_label', 'Bronze',
            'newly_awarded', true
        )
    )
    RETURNING event_id INTO v_event_id;
    
    RAISE NOTICE 'Created earned_badge event with ID: %', v_event_id;
    
    -- Create a test recipe_added event
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'recipe_added',
        jsonb_build_object(
            'name', 'Test Recipe for My Feed',
            'has_ingredients', true,
            'instructions_len', 150,
            'imported', false
        )
    )
    RETURNING event_id INTO v_event_id;
    
    RAISE NOTICE 'Created recipe_added event with ID: %', v_event_id;
    
    -- Create another earned_badge event
    INSERT INTO public.user_events (user_id, type, meta)
    VALUES (
        v_user_id,
        'earned_badge',
        jsonb_build_object(
            'badge_code', 'list_legend',
            'badge_name', 'List Legend',
            'tier', 1,
            'tier_label', 'Bronze',
            'newly_awarded', true
        )
    )
    RETURNING event_id INTO v_event_id;
    
    RAISE NOTICE 'Created second earned_badge event with ID: %', v_event_id;
    
END $$;

-- Check what events were created
SELECT 'Events created:' as info, event_id, user_id, type, meta, created_at 
FROM public.user_events 
WHERE user_id = (SELECT user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC;

-- Test get_my_feed for this user
SELECT 'My Feed results:' as info, event_id, kind, payload, created_at 
FROM public.get_my_feed(
    (SELECT user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1), 
    10
);
