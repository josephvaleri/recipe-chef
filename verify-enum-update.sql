-- Verification script: Check if earned_badge was added to the enum
-- Run this AFTER Part 1 to verify the enum was updated

SELECT unnest(enum_range(NULL::public.user_event_type)) as event_types;

-- Check specifically for earned_badge
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'user_event_type'::regtype 
      AND enumlabel = 'earned_badge'
    ) 
    THEN '✅ earned_badge is in the enum' 
    ELSE '❌ earned_badge is missing from enum' 
  END as status;
