-- Manual test: Create a simple earned_badge event and check if it appears in My Feed

-- Step 1: Create a test earned_badge event
INSERT INTO public.user_events (user_id, type, meta)
VALUES (
    auth.uid(),
    'earned_badge',
    jsonb_build_object(
        'badge_code', 'test_badge',
        'badge_name', 'Test Badge',
        'tier', 1,
        'tier_label', 'Bronze',
        'newly_awarded', true
    )
);

-- Step 2: Check if the event was created
SELECT 'Event created:' as status, event_id, type, meta, created_at 
FROM public.user_events 
WHERE user_id = auth.uid() 
AND type = 'earned_badge'
ORDER BY created_at DESC 
LIMIT 1;

-- Step 3: Check what get_my_feed returns
SELECT 'My Feed result:' as status, event_id, kind, payload, created_at 
FROM public.get_my_feed(auth.uid(), 5);
