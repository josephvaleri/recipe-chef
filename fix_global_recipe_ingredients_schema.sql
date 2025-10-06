-- Fix global_recipe_ingredients table to allow NULL ingredient_id
-- This allows storing raw ingredient text without requiring ingredient table mapping

-- Make ingredient_id nullable
ALTER TABLE public.global_recipe_ingredients 
ALTER COLUMN ingredient_id DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN public.global_recipe_ingredients.ingredient_id IS 'References ingredients table when parsed, NULL for raw text ingredients';

-- Update the table comment
COMMENT ON TABLE public.global_recipe_ingredients IS 'Global recipe ingredients - can store either parsed ingredients (with ingredient_id) or raw text (with raw_name)';
