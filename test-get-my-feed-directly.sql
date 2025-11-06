-- Test the get_my_feed function directly to see what it returns

-- First, let's see what user we're testing with
SELECT user_id, display_name FROM profiles LIMIT 1;

-- Test the get_my_feed function with the first user
DO $$
DECLARE
    test_user_id uuid;
    feed_result RECORD;
BEGIN
    -- Get the first user
    SELECT user_id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing get_my_feed for user: %', test_user_id;
        
        -- Call the function directly
        FOR feed_result IN 
            SELECT * FROM get_my_feed(test_user_id, 10)
        LOOP
            RAISE NOTICE 'Feed result: event_id=%, kind=%, payload=%', 
                feed_result.event_id, feed_result.kind, feed_result.payload;
        END LOOP;
        
        -- Also check if there are any user_events for this user
        SELECT COUNT(*) INTO feed_result FROM user_events WHERE user_id = test_user_id;
        RAISE NOTICE 'Total user_events for this user: %', feed_result;
        
    ELSE
        RAISE NOTICE 'No users found';
    END IF;
END $$;

-- Let's also check the get_my_feed function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_my_feed' 
AND routine_schema = 'public';
