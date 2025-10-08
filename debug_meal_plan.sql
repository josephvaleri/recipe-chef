-- Debug script to check meal_plan data and fix the RPC function
-- Run this in your Supabase SQL editor

-- 1. Check what's in your meal_plan table
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

-- 2. Check if ingredients exist for your recipes
SELECT 
  'user_recipe' as type,
  ur.user_recipe_id,
  ur.title,
  uri.amount,
  uri.unit,
  i.name as ingredient_name
FROM public.user_recipes ur
JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = ur.user_recipe_id
JOIN public.ingredients i ON i.ingredient_id = uri.ingredient_id
WHERE ur.user_recipe_id IN (SELECT DISTINCT user_recipe_id FROM public.meal_plan WHERE user_recipe_id IS NOT NULL)
LIMIT 5

UNION ALL

SELECT 
  'global_recipe' as type,
  gr.recipe_id,
  gr.title,
  gri.amount,
  gri.unit,
  i.name as ingredient_name
FROM public.global_recipes gr
JOIN public.global_recipe_ingredients gri ON gri.recipe_id = gr.recipe_id
JOIN public.ingredients i ON i.ingredient_id = gri.ingredient_id
WHERE gr.recipe_id IN (SELECT DISTINCT global_recipe_id FROM public.meal_plan WHERE global_recipe_id IS NOT NULL)
LIMIT 5;

-- 3. Test the RPC function with a specific date range
-- Replace 'your-user-id-here' with your actual user ID
SELECT * FROM public.generate_shopping_list(
  'your-user-id-here'::uuid,
  '2024-12-01'::date,
  7,
  4
);
