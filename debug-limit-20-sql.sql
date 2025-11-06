-- Debug the specific issue with limit=20 in the database
-- This will help us understand what's happening at the SQL level

-- Step 1: Check total events for current user
SELECT 'Step 1: Total events for current user' as step;
SELECT COUNT(*) as total_events
FROM public.user_events 
WHERE user_id = auth.uid();

-- Step 2: Check events with different LIMIT values
SELECT 'Step 2: Testing different LIMIT values in SQL' as step;

-- Test with LIMIT 10
SELECT 
    'LIMIT 10' as test_case,
    COUNT(*) as result_count
FROM (
    SELECT * FROM public.user_events 
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 10
) as subquery;

-- Test with LIMIT 20
SELECT 
    'LIMIT 20' as test_case,
    COUNT(*) as result_count
FROM (
    SELECT * FROM public.user_events 
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 20
) as subquery;

-- Test with LIMIT 50
SELECT 
    'LIMIT 50' as test_case,
    COUNT(*) as result_count
FROM (
    SELECT * FROM public.user_events 
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT 50
) as subquery;

-- Step 3: Test the get_my_feed function directly with different limits
SELECT 'Step 3: Testing get_my_feed function directly' as step;

SELECT 
    'get_my_feed(limit=10)' as test_case,
    COUNT(*) as result_count
FROM public.get_my_feed(auth.uid(), 10);

SELECT 
    'get_my_feed(limit=20)' as test_case,
    COUNT(*) as result_count
FROM public.get_my_feed(auth.uid(), 20);

SELECT 
    'get_my_feed(limit=50)' as test_case,
    COUNT(*) as result_count
FROM public.get_my_feed(auth.uid(), 50);

-- Step 4: Check if there are any NULL or problematic values
SELECT 'Step 4: Checking for problematic values' as step;
SELECT 
    event_id,
    type,
    created_at,
    CASE 
        WHEN created_at IS NULL THEN 'NULL created_at'
        WHEN type IS NULL THEN 'NULL type'
        ELSE 'OK'
    END as status
FROM public.user_events 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 25;

-- Step 5: Check the exact query that get_my_feed uses
SELECT 'Step 5: Testing exact get_my_feed query logic' as step;

-- This simulates what get_my_feed does internally
SELECT 
    ue.event_id,
    CASE 
        WHEN ue.type = 'earned_badge' THEN 'BADGE_EARNED'
        WHEN ue.type = 'recipe_added' THEN 'RECIPE_UPVOTES'
        ELSE ue.type::text
    END as kind,
    ue.meta as payload,
    ue.created_at,
    NULL::timestamptz as read_at
FROM public.user_events ue
WHERE ue.user_id = auth.uid()
ORDER BY ue.created_at DESC
LIMIT 20;

-- Step 6: Check if there's a pattern in the data
SELECT 'Step 6: Checking data patterns' as step;
SELECT 
    type,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM public.user_events 
WHERE user_id = auth.uid()
GROUP BY type
ORDER BY count DESC;
