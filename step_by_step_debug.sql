-- Step-by-step debug to find the exact issue
-- Run this in your Supabase SQL editor

-- Step 1: Check what meal plans exist
SELECT 
  'Step 1: Meal Plans' as step,
  COUNT(*) as count
FROM public.meal_plan;

-- Step 2: Check meal plans with user recipes
SELECT 
  'Step 2: Meal Plans with User Recipes' as step,
  COUNT(*) as count
FROM public.meal_plan mp
WHERE mp.user_recipe_id IS NOT NULL;

-- Step 3: Check meal plans with ingredients
SELECT 
  'Step 3: Meal Plans with Ingredients' as step,
  COUNT(*) as count
FROM public.meal_plan mp
JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = ur.user_recipe_id
WHERE mp.user_recipe_id IS NOT NULL;

-- Step 4: Show actual meal plan data
SELECT 
  'Step 4: Actual Meal Plan Data' as step,
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

-- Step 5: Show ingredients for these recipes
SELECT 
  'Step 5: Ingredients for Meal Plan Recipes' as step,
  mp.id,
  ur.title as recipe_title,
  uri.amount,
  uri.unit,
  i.name as ingredient_name,
  ic.name as category_name
FROM public.meal_plan mp
JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = ur.user_recipe_id
JOIN public.ingredients i ON i.ingredient_id = uri.ingredient_id
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE mp.user_recipe_id IS NOT NULL
ORDER BY mp.date DESC
LIMIT 10;

-- Step 6: Test date filtering (replace with actual dates from Step 4)
SELECT 
  'Step 6: Date Filter Test' as step,
  mp.id,
  mp.date,
  ur.title as recipe_title
FROM public.meal_plan mp
JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
WHERE mp.user_recipe_id IS NOT NULL
  AND mp.date >= '2024-12-01'::date
  AND mp.date < '2024-12-31'::date
ORDER BY mp.date DESC;
