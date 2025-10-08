-- Test script to see what's in your meal_plan table
-- Run this in your Supabase SQL editor

-- 1. Check meal_plan entries
SELECT 
  'meal_plan' as table_name,
  COUNT(*) as count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM public.meal_plan;

-- 2. Check meal_plan entries with recipe details
SELECT 
  mp.id,
  mp.user_id,
  mp.date,
  mp.user_recipe_id,
  mp.global_recipe_id,
  ur.title as user_recipe_title,
  gr.title as global_recipe_title
FROM public.meal_plan mp
LEFT JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
LEFT JOIN public.global_recipes gr ON gr.recipe_id = mp.global_recipe_id
ORDER BY mp.date DESC
LIMIT 10;

-- 3. Check if there are any ingredients for these recipes
SELECT 
  'user_recipe_ingredients' as type,
  COUNT(*) as count
FROM public.user_recipe_ingredients uri
WHERE uri.user_recipe_id IN (
  SELECT DISTINCT user_recipe_id 
  FROM public.meal_plan 
  WHERE user_recipe_id IS NOT NULL
)

UNION ALL

SELECT 
  'global_recipe_ingredients' as type,
  COUNT(*) as count
FROM public.global_recipe_ingredients gri
WHERE gri.recipe_id IN (
  SELECT DISTINCT global_recipe_id 
  FROM public.meal_plan 
  WHERE global_recipe_id IS NOT NULL
);

-- 4. Test the function with a recent date (replace with your actual user ID)
-- You can get your user ID from the meal_plan table above
SELECT * FROM public.generate_shopping_list(
  (SELECT DISTINCT user_id FROM public.meal_plan LIMIT 1)::uuid,
  '2024-12-01'::date,
  7,
  4
);
