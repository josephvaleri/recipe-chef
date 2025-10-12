-- Fix RLS policies that had incorrect table references
-- This was causing only 1 ingredient to be inserted instead of all ingredients

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can manage own recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can manage own recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can manage own recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can manage own recipe tags" ON public.user_recipe_tags;

-- Recreate with correct table references
CREATE POLICY "Users can manage own recipe ingredients" ON public.user_recipe_ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_recipes
      WHERE user_recipes.user_recipe_id = user_recipe_ingredients.user_recipe_id 
        AND user_recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own recipe steps" ON public.user_recipe_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_recipes
      WHERE user_recipes.user_recipe_id = user_recipe_steps.user_recipe_id 
        AND user_recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own recipe equipment" ON public.user_recipe_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_recipes
      WHERE user_recipes.user_recipe_id = user_recipe_equipment.user_recipe_id 
        AND user_recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own recipe tags" ON public.user_recipe_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_recipes
      WHERE user_recipes.user_recipe_id = user_recipe_tags.user_recipe_id 
        AND user_recipes.user_id = auth.uid()
    )
  );

