-- Simple diagnostic to check My Feed issues
-- Run each query separately to see results

-- 1. Check if we have any events at all
SELECT 'Total events in user_events table:' as check_type, COUNT(*) as count FROM public.user_events;

-- 2. Check if we have earned_badge events
SELECT 'Earned badge events:' as check_type, COUNT(*) as count FROM public.user_events WHERE type = 'earned_badge';

-- 3. Check current user ID
SELECT 'Current user ID:' as check_type, auth.uid() as user_id;

-- 4. Check events for current user
SELECT 'Events for current user:' as check_type, COUNT(*) as count FROM public.user_events WHERE user_id = auth.uid();

-- 5. Check if earned_badge is in enum
SELECT 'earned_badge in enum:' as check_type, 
CASE WHEN EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_event_type'::regtype AND enumlabel = 'earned_badge') 
THEN 'YES' ELSE 'NO' END as result;

-- 6. Test get_my_feed function
SELECT 'get_my_feed result count:' as check_type, COUNT(*) as count FROM public.get_my_feed(auth.uid(), 10);

-- 7. Show actual get_my_feed results
SELECT 'get_my_feed results:' as check_type, event_id, kind, payload, created_at FROM public.get_my_feed(auth.uid(), 5);
