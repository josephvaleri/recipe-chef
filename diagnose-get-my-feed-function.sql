-- Diagnostic script to check which get_my_feed function is being used
-- and identify the source of the limit parameter bug

-- Step 1: Check all versions of get_my_feed function
SELECT 'Step 1: All get_my_feed function definitions' as step;
SELECT 
    specific_name,
    routine_definition,
    data_type as return_type
FROM information_schema.routines 
WHERE specific_name LIKE '%get_my_feed%'
AND routine_schema = 'public'
ORDER BY specific_name;

-- Step 2: Check function parameters
SELECT 'Step 2: get_my_feed function parameters' as step;
SELECT 
    parameter_name,
    data_type,
    parameter_mode,
    ordinal_position
FROM information_schema.parameters 
WHERE specific_schema = 'public' 
AND specific_name LIKE '%get_my_feed%'
ORDER BY ordinal_position;

-- Step 3: Check which tables exist
SELECT 'Step 3: Check table existence' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_events' AND table_schema = 'public')
        THEN '✅ feed_events table exists'
        ELSE '❌ feed_events table missing'
    END as feed_events_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_events' AND table_schema = 'public')
        THEN '✅ user_events table exists'
        ELSE '❌ user_events table missing'
    END as user_events_status;

-- Step 4: Check data in both tables
SELECT 'Step 4: Check data in both tables' as step;
SELECT 
    'feed_events' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users
FROM public.feed_events
WHERE user_id = auth.uid()
UNION ALL
SELECT 
    'user_events' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_events
WHERE user_id = auth.uid();

-- Step 5: Test the function with different limits
SELECT 'Step 5: Test function with different limits' as step;
SELECT 
    'limit=10' as test_case,
    COUNT(*) as result_count
FROM public.get_my_feed(auth.uid(), 10)
UNION ALL
SELECT 
    'limit=20' as test_case,
    COUNT(*) as result_count
FROM public.get_my_feed(auth.uid(), 20)
UNION ALL
SELECT 
    'limit=50' as test_case,
    COUNT(*) as result_count
FROM public.get_my_feed(auth.uid(), 50);

-- Step 6: Check if there are multiple function definitions
SELECT 'Step 6: Check for function conflicts' as step;
SELECT 
    specific_name,
    routine_definition
FROM information_schema.routines 
WHERE specific_name LIKE '%get_my_feed%'
AND routine_schema = 'public';

-- Step 7: Check function return types
SELECT 'Step 7: Function return types' as step;
SELECT 
    specific_name,
    data_type,
    character_maximum_length
FROM information_schema.routines 
WHERE specific_name LIKE '%get_my_feed%'
AND routine_schema = 'public';
