-- Check what event types actually exist in the database

SELECT 
    type,
    COUNT(*) as count
FROM user_events 
GROUP BY type
ORDER BY count DESC;

-- Check the specific events we created
SELECT 
    event_id,
    type,
    meta,
    created_at
FROM user_events 
ORDER BY created_at DESC
LIMIT 10;
