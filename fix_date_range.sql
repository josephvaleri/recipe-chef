-- Fix the shopping list function to use the correct date range
-- Your meal plans are in October 2025, not December 2024

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

-- Test the function with today's date (October 7, 2025)
SELECT * FROM public.generate_shopping_list(
  '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'::uuid,
  '2025-10-07'::date,  -- Today's date
  7,  -- 7 days to cover your meal plans
  4   -- 4 people
);
