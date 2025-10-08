-- Fix shopping list generator to work with existing meal_plan table
-- The original migration created meal_plan_entries, but the app uses meal_plan

-- Update the RPC function to work with the existing meal_plan table
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
selected_entries AS (
  SELECT mp.id, mp.user_id, mp.date, mp.user_recipe_id, mp.global_recipe_id
  FROM public.meal_plan mp
  JOIN date_window w ON w.d = mp.date
  WHERE mp.user_id = p_user_id
),
-- Handle both user recipes and global recipes
recipe_data AS (
  SELECT 
    se.id,
    se.date,
    COALESCE(ur.user_recipe_id, gr.recipe_id) AS recipe_id,
    COALESCE(ur.servings, gr.servings) AS servings,
    'user' AS recipe_type
  FROM selected_entries se
  LEFT JOIN public.user_recipes ur ON ur.user_recipe_id = se.user_recipe_id
  LEFT JOIN public.global_recipes gr ON gr.recipe_id = se.global_recipe_id
  WHERE se.user_recipe_id IS NOT NULL OR se.global_recipe_id IS NOT NULL
),
eff_servings AS (
  SELECT rd.recipe_id,
         COALESCE(NULLIF(rd.servings::numeric, 0), 4)::numeric AS servings
  FROM recipe_data rd
),
ri AS (
  SELECT 
    rd.id,
    rd.recipe_id,
    i.ingredient_id, 
    i.name AS ingredient_name, 
    i.category_id,
    ic.name AS category_name,
    -- Handle both user and global recipe ingredients
    COALESCE(uri.amount, gri.amount) AS amount,
    COALESCE(uri.unit, gri.unit) AS unit
  FROM recipe_data rd
  LEFT JOIN public.user_recipe_ingredients uri ON uri.user_recipe_id = rd.recipe_id
  LEFT JOIN public.global_recipe_ingredients gri ON gri.recipe_id = rd.recipe_id
  JOIN public.ingredients i ON i.ingredient_id = COALESCE(uri.ingredient_id, gri.ingredient_id)
  JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
  WHERE COALESCE(uri.ingredient_id, gri.ingredient_id) IS NOT NULL
),
normalized AS (
  SELECT
    ri.category_id,
    ri.category_name,
    ri.ingredient_id,
    ri.ingredient_name,
    mu.family,
    -- choose base unit per family for normalization
    CASE mu.family
      WHEN 'mass' THEN 'g'
      WHEN 'volume' THEN 'ml'
      ELSE 'count'
    END AS base_unit,
    -- scale factor people / servings
    (p_people / (SELECT es.servings FROM eff_servings es WHERE es.recipe_id = ri.recipe_id LIMIT 1))::numeric AS scale_factor,
    ri.amount::numeric AS amount,
    ri.unit
  FROM ri
  LEFT JOIN public.measurement_units mu ON lower(ri.unit) = mu.unit_code
),
to_base AS (
  SELECT
    n.category_id,
    n.category_name,
    n.ingredient_id,
    n.ingredient_name,
    COALESCE(mu.family,'count') AS family,
    CASE COALESCE(mu.family,'count')
      WHEN 'mass'   THEN 'g'
      WHEN 'volume' THEN 'ml'
      ELSE 'count'
    END AS unit,
    -- If unit unknown or family is count, treat to_base_ratio = 1
    (n.amount * n.scale_factor * COALESCE(mu.to_base_ratio, 1))::numeric AS qty_base
  FROM normalized n
  LEFT JOIN public.measurement_units mu ON lower(n.unit) = mu.unit_code
),
aggregated AS (
  SELECT
    category_id, category_name, ingredient_id, ingredient_name, unit,
    SUM(qty_base) AS quantity
  FROM to_base
  GROUP BY category_id, category_name, ingredient_id, ingredient_name, unit
)
SELECT * FROM aggregated
ORDER BY category_name, ingredient_name;
$$;
