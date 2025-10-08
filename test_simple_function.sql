-- Test the simple shopping list function
-- Run this in your Supabase SQL editor

-- 1. First, let's see what meal plans exist
SELECT 
  mp.id,
  mp.user_id,
  mp.date,
  mp.user_recipe_id,
  ur.title as recipe_title,
  ur.servings
FROM public.meal_plan mp
LEFT JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
WHERE mp.user_recipe_id IS NOT NULL
ORDER BY mp.date DESC
LIMIT 5;

-- 2. Test the function with a recent date range
-- Replace 'your-user-id' with the user_id from the query above
SELECT * FROM public.generate_shopping_list(
  (SELECT DISTINCT user_id FROM public.meal_plan WHERE user_recipe_id IS NOT NULL LIMIT 1)::uuid,
  '2024-12-01'::date,
  30,  -- 30 days to catch any recent meal plans
  4
);

-- 3. If that doesn't work, let's test with a specific date range
-- Check what dates you have meal plans for
SELECT DISTINCT date FROM public.meal_plan ORDER BY date DESC LIMIT 10;
