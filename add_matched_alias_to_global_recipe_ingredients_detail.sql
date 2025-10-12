-- Add matched_alias column to global_recipe_ingredients_detail table
-- This column stores which alias was used when matching ingredients

ALTER TABLE public.global_recipe_ingredients_detail 
ADD COLUMN matched_alias text;

-- Add comment to document the field
COMMENT ON COLUMN public.global_recipe_ingredients_detail.matched_alias IS 'The alias that was matched from ingredient_aliases table when no exact match found in ingredients table';

-- Create index for better performance on alias lookups
CREATE INDEX IF NOT EXISTS idx_global_recipe_ingredients_detail_matched_alias 
  ON public.global_recipe_ingredients_detail(matched_alias);


