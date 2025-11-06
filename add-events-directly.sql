-- Add events directly to the database for the current user
-- This will create events that should appear in My Feed

-- First, let's see what users we have
SELECT user_id, display_name FROM profiles LIMIT 5;

-- Get the first user ID to create events for
-- (Replace this with your actual user ID if you know it)
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get the first user from profiles
    SELECT user_id INTO target_user_id FROM profiles LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        RAISE NOTICE 'Creating events for user: %', target_user_id;
        
        -- Create a recipe_added event
        INSERT INTO user_events (user_id, type, meta)
        VALUES (
            target_user_id,
            'recipe_added',
            jsonb_build_object(
                'name', 'Direct Database Recipe',
                'has_ingredients', true,
                'instructions_len', 200,
                'imported', false
            )
        );
        
        -- Create a shopping_list_generated event
        INSERT INTO user_events (user_id, type, meta)
        VALUES (
            target_user_id,
            'shopping_list_generated',
            jsonb_build_object(
                'item_count', 8,
                'recipe_count', 3
            )
        );
        
        -- Create an earned_badge event
        INSERT INTO user_events (user_id, type, meta)
        VALUES (
            target_user_id,
            'earned_badge',
            jsonb_build_object(
                'badge_code', 'recipe_master',
                'badge_name', 'Recipe Master',
                'tier', 2,
                'tier_label', 'Silver',
                'newly_awarded', true
            )
        );
        
        RAISE NOTICE 'Created 3 events for user: %', target_user_id;
        
        -- Test the get_my_feed function
        PERFORM get_my_feed(target_user_id, 10);
        
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;
END $$;

-- Check the events we just created
SELECT 
    ue.event_id,
    ue.type,
    ue.meta,
    ue.created_at,
    p.display_name
FROM user_events ue
JOIN profiles p ON ue.user_id = p.user_id
ORDER BY ue.created_at DESC
LIMIT 5;
