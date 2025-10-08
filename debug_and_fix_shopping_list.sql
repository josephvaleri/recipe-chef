-- Debug and fix the shopping list RPC function
-- Run this in your Supabase SQL editor

-- First, let's create a simpler version that's easier to debug
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
WITH date_window AS (
  SELECT generate_series(p_start_date, (p_start_date + (p_days - 1) * INTERVAL '1 day')::date, '1 day')::date AS d
),
-- Get meal plans in the date range
meal_plans AS (
  SELECT mp.id, mp.user_id, mp.date, mp.user_recipe_id, mp.global_recipe_id
  FROM public.meal_plan mp
  JOIN date_window w ON w.d = mp.date
  WHERE mp.user_id = p_user_id
),
-- Get user recipe ingredients
user_recipe_ingredients AS (
  SELECT 
    mp.id,
    mp.date,
    ur.user_recipe_id as recipe_id,
    ur.servings,
    uri.amount,
    uri.unit,
    i.ingredient_id,
    i.name as ingredient_name,
    i.category_id,
    ic.name as category_name
  FROM meal_plans mp
  JOIN public.user_recipes ur ON ur.user_recipe_id = mp.user_recipe_id
  JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = ur.user_recipe_id
  JOIN public.ingredients i ON i.ingredient_id = uri.ingredient_id
  JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
  WHERE mp.user_recipe_id IS NOT NULL
),
-- Get global recipe ingredients
global_recipe_ingredients AS (
  SELECT 
    mp.id,
    mp.date,
    gr.recipe_id,
    gr.servings,
    gri.amount,
    gri.unit,
    i.ingredient_id,
    i.name as ingredient_name,
    i.category_id,
    ic.name as category_name
  FROM meal_plans mp
  JOIN public.global_recipes gr ON gr.recipe_id = mp.global_recipe_id
  JOIN public.global_recipe_ingredients gri ON gri.recipe_id = gr.recipe_id
  JOIN public.ingredients i ON i.ingredient_id = gri.ingredient_id
  JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
  WHERE mp.global_recipe_id IS NOT NULL
),
-- Combine all ingredients
all_ingredients AS (
  SELECT * FROM user_recipe_ingredients
  UNION ALL
  SELECT * FROM global_recipe_ingredients
),
-- Calculate scaling and normalize units
scaled_ingredients AS (
  SELECT 
    ai.category_id,
    ai.category_name,
    ai.ingredient_id,
    ai.ingredient_name,
    -- Scale by people/servings ratio
    (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))::numeric AS scale_factor,
    ai.amount::numeric AS amount,
    ai.unit,
    -- Try to normalize units
    CASE 
      WHEN LOWER(ai.unit) IN ('g', 'gram', 'grams') THEN 'g'
      WHEN LOWER(ai.unit) IN ('kg', 'kilogram', 'kilograms') THEN 'g'
      WHEN LOWER(ai.unit) IN ('ml', 'milliliter', 'milliliters') THEN 'ml'
      WHEN LOWER(ai.unit) IN ('l', 'liter', 'liters', 'litre', 'litres') THEN 'ml'
      WHEN LOWER(ai.unit) IN ('cup', 'cups') THEN 'ml'
      WHEN LOWER(ai.unit) IN ('tbsp', 'tablespoon', 'tablespoons') THEN 'ml'
      WHEN LOWER(ai.unit) IN ('tsp', 'teaspoon', 'teaspoons') THEN 'ml'
      WHEN LOWER(ai.unit) IN ('oz', 'ounce', 'ounces') THEN 'g'
      WHEN LOWER(ai.unit) IN ('lb', 'pound', 'pounds') THEN 'g'
      ELSE 'count'
    END AS normalized_unit,
    -- Convert to base units and scale
    CASE 
      WHEN LOWER(ai.unit) IN ('g', 'gram', 'grams') THEN ai.amount::numeric * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('kg', 'kilogram', 'kilograms') THEN ai.amount::numeric * 1000 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('ml', 'milliliter', 'milliliters') THEN ai.amount::numeric * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('l', 'liter', 'liters', 'litre', 'litres') THEN ai.amount::numeric * 1000 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('cup', 'cups') THEN ai.amount::numeric * 240 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('tbsp', 'tablespoon', 'tablespoons') THEN ai.amount::numeric * 15 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('tsp', 'teaspoon', 'teaspoons') THEN ai.amount::numeric * 5 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('oz', 'ounce', 'ounces') THEN ai.amount::numeric * 28.35 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      WHEN LOWER(ai.unit) IN ('lb', 'pound', 'pounds') THEN ai.amount::numeric * 453.6 * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
      ELSE ai.amount::numeric * (p_people / COALESCE(NULLIF(ai.servings::numeric, 0), 4))
    END AS quantity
  FROM all_ingredients ai
),
-- Aggregate by ingredient
aggregated AS (
  SELECT 
    category_id, 
    category_name, 
    ingredient_id, 
    ingredient_name, 
    normalized_unit as unit,
    SUM(quantity) AS quantity
  FROM scaled_ingredients
  GROUP BY category_id, category_name, ingredient_id, ingredient_name, normalized_unit
)
SELECT * FROM aggregated
ORDER BY category_name, ingredient_name;
$$;
