-- Debug the ingredients issue
-- Run this in your Supabase SQL editor

-- 1. Check what's in user_recipe_ingredients for your recipes
SELECT 
  uri.user_recipe_id,
  ur.title as recipe_title,
  uri.amount,
  uri.unit,
  uri.ingredient_id,
  i.name as ingredient_name
FROM public.user_recipe_ingredients uri
JOIN public.user_recipes ur ON ur.user_recipe_id = uri.user_recipe_id
LEFT JOIN public.ingredients i ON i.ingredient_id = uri.ingredient_id
WHERE uri.user_recipe_id IN (1291, 1292, 1293, 1294)  -- Your recipe IDs
ORDER BY uri.user_recipe_id, uri.ingredient_id;

-- 2. Check if there are any ingredients at all
SELECT 
  'Total ingredients' as type,
  COUNT(*) as count
FROM public.ingredients

UNION ALL

SELECT 
  'Total user_recipe_ingredients' as type,
  COUNT(*) as count
FROM public.user_recipe_ingredients

UNION ALL

SELECT 
  'User_recipe_ingredients with null ingredient_id' as type,
  COUNT(*) as count
FROM public.user_recipe_ingredients
WHERE ingredient_id IS NULL;

-- 3. Check ingredient categories
SELECT 
  ic.category_id,
  ic.name as category_name,
  COUNT(i.ingredient_id) as ingredient_count
FROM public.ingredient_categories ic
LEFT JOIN public.ingredients i ON i.category_id = ic.category_id
GROUP BY ic.category_id, ic.name
ORDER BY ingredient_count DESC;
