-- Create global_recipe_ingredients_detail table
-- This table stores detailed ingredient analysis for global recipes
-- Similar to user_recipe_ingredients_detail but for the global cookbook

CREATE TABLE IF NOT EXISTS public.global_recipe_ingredients_detail (
  id bigserial PRIMARY KEY,
  recipe_id bigint NOT NULL REFERENCES public.global_recipes(recipe_id) ON DELETE CASCADE,
  ingredient_id int REFERENCES public.ingredients(ingredient_id) ON DELETE SET NULL,
  original_text text NOT NULL,
  matched_term text,
  match_type text CHECK (match_type IN ('exact', 'alias', 'not_found')),
  category_id int REFERENCES public.ingredient_categories(category_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_global_recipe_ingredients_detail_recipe_id 
  ON public.global_recipe_ingredients_detail(recipe_id);

CREATE INDEX IF NOT EXISTS idx_global_recipe_ingredients_detail_ingredient_id 
  ON public.global_recipe_ingredients_detail(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_global_recipe_ingredients_detail_category_id 
  ON public.global_recipe_ingredients_detail(category_id);

-- Enable RLS
ALTER TABLE public.global_recipe_ingredients_detail ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow everyone to read global recipe ingredients detail
CREATE POLICY "Anyone can view global recipe ingredients detail" ON public.global_recipe_ingredients_detail
  FOR SELECT USING (true);

-- Only admins and moderators can insert/update/delete
CREATE POLICY "Admins and moderators can manage global recipe ingredients detail" ON public.global_recipe_ingredients_detail
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Grant necessary permissions
GRANT SELECT ON public.global_recipe_ingredients_detail TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.global_recipe_ingredients_detail TO authenticated;