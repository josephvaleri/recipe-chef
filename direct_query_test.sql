-- Direct query test - bypass the RPC function entirely
-- Run this in your Supabase SQL editor

-- This is exactly what the RPC function should be doing, but as a direct query
-- Replace 'your-user-id-here' with your actual user ID from the debug results

SELECT 
  i.category_id,
  ic.name as category_name,
  i.ingredient_id,
  i.name as ingredient_name,
  COALESCE(uri.unit, 'count') as unit,
  SUM(
    COALESCE(uri.amount::numeric, 1) * 
    (4 / COALESCE(NULLIF(ur.servings::numeric, 0), 4))  -- 4 people, default 4 servings
  ) as quantity
FROM public.meal_plan mp
JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = ur.user_recipe_id
JOIN public.ingredients i ON i.ingredient_id = uri.ingredient_id
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE mp.user_id = 'your-user-id-here'::uuid  -- Replace with your actual user ID
  AND mp.user_recipe_id IS NOT NULL
  -- Remove date filtering for now to see if that's the issue
GROUP BY i.category_id, ic.name, i.ingredient_id, i.name, uri.unit
ORDER BY ic.name, i.name;
