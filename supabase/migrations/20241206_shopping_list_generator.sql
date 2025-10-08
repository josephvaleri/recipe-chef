-- Shopping List Generator Migration
-- Creates meal planning, unit normalization, and shopping list generation functionality

-- 1. Meal planning entries (one row per recipe per date per user)
CREATE TABLE IF NOT EXISTS public.meal_plan_entries (
  entry_id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  recipe_id bigint NOT NULL REFERENCES public.user_recipes(user_recipe_id) ON DELETE CASCADE,
  servings_override numeric,        -- optional per-entry override
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_user_date
  ON public.meal_plan_entries(user_id, plan_date);

-- 2. Units dictionary (mass/volume/count); only if not already present
CREATE TABLE IF NOT EXISTS public.measurement_units (
  unit_code text PRIMARY KEY,          -- e.g., 'g','kg','ml','l','tsp','tbsp','cup','oz','lb','count'
  family text NOT NULL CHECK (family IN ('mass','volume','count')),
  to_base_ratio numeric NOT NULL       -- mass:g, volume:ml, count:1
);

-- Seed minimal units (idempotent)
INSERT INTO public.measurement_units(unit_code, family, to_base_ratio) VALUES
('g','mass',1), ('kg','mass',1000), ('oz','mass',28.3495), ('lb','mass',453.592),
('ml','volume',1), ('l','volume',1000), ('tsp','volume',4.92892),
('tbsp','volume',14.7868), ('cup','volume',236.588),
('count','count',1)
ON CONFLICT (unit_code) DO NOTHING;

-- 3. Helper view to provide effective servings (default 4 if null)
CREATE OR REPLACE VIEW public.recipe_effective_servings AS
SELECT r.user_recipe_id AS recipe_id,
       COALESCE(NULLIF(r.servings::numeric, 0), 4)::numeric AS servings
FROM public.user_recipes r;

-- 4. Generator RPC:
--    Inputs: user_id, start_date, days, people
--    Output: grouped lines by ingredient category and normalized unit (per family)
--    Note: we only convert within the SAME unit family (mass<->mass, volume<->volume, count separately).
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
  SELECT e.*
  FROM public.meal_plan_entries e
  JOIN date_window w ON w.d = e.plan_date
  WHERE e.user_id = p_user_id
),
eff_servings AS (
  SELECT s.recipe_id,
         COALESCE(s.servings_override, es.servings) AS entry_servings,
         es.servings AS recipe_servings
  FROM selected_entries s
  JOIN public.recipe_effective_servings es ON es.recipe_id = s.recipe_id
),
ri AS (
  SELECT s.entry_id, s.recipe_id, s.servings_override,
         i.ingredient_id, i.name AS ingredient_name, i.category_id,
         ic.name AS category_name,
         rix.amount, rix.unit
  FROM selected_entries s
  JOIN public.user_recipe_ingredients rix ON rix.user_recipe_id = s.recipe_id
  JOIN public.ingredients i ON i.ingredient_id = rix.ingredient_id
  JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
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
    -- scale factor people / servings; fallback already baked into view
    (p_people / (SELECT es.recipe_servings FROM eff_servings es WHERE es.recipe_id = ri.recipe_id LIMIT 1))::numeric AS scale_factor,
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

-- RLS policies for meal_plan_entries
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS meal_plan_entries_owner ON public.meal_plan_entries;

-- Create new policy
CREATE POLICY meal_plan_entries_owner ON public.meal_plan_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_entries TO authenticated;
GRANT USAGE ON SEQUENCE public.meal_plan_entries_entry_id_seq TO authenticated;
