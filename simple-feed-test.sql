-- Simple test to see what get_my_feed returns

-- First, let's see what users and events we have
SELECT 'Users in profiles:' as info;
SELECT user_id, display_name FROM profiles LIMIT 3;

SELECT 'Event types in user_events:' as info;
SELECT type, COUNT(*) as count FROM user_events GROUP BY type;

SELECT 'Recent events:' as info;
SELECT event_id, user_id, type, created_at FROM user_events ORDER BY created_at DESC LIMIT 5;

-- Now test get_my_feed with the first user
SELECT 'Testing get_my_feed function:' as info;
SELECT * FROM get_my_feed(
    (SELECT user_id FROM profiles LIMIT 1), 
    10
);
