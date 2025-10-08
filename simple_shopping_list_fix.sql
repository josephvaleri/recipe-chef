-- Simple, direct shopping list function
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION public.generate_shopping_list(
  p_user_id uuid,
  p_start_date date,
  p_days int,
  p_people numeric
)
RETURNS TABLE(
  category_id int,
  category_name text,
  ingredient_id int,
  ingredient_name text,
  unit text,
  quantity numeric
)
LANGUAGE sql
STABLE
AS $$
-- Simple approach: get meal plans, get ingredients, scale and aggregate
SELECT 
  i.category_id,
  ic.name as category_name,
  i.ingredient_id,
  i.name as ingredient_name,
  COALESCE(uri.unit, 'count') as unit,
  SUM(
    COALESCE(uri.amount::numeric, 1) * 
    (p_people / COALESCE(NULLIF(ur.servings::numeric, 0), 4))
  ) as quantity
FROM public.meal_plan mp
JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = ur.user_recipe_id
JOIN public.ingredients i ON i.ingredient_id = uri.ingredient_id
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE mp.user_id = p_user_id
  AND mp.date >= p_start_date
  AND mp.date < p_start_date + (p_days * INTERVAL '1 day')
  AND mp.user_recipe_id IS NOT NULL
GROUP BY i.category_id, ic.name, i.ingredient_id, i.name, uri.unit
ORDER BY ic.name, i.name;
$$;
