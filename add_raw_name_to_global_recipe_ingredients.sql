-- Add raw_name field to global_recipe_ingredients table
-- This will store the original ingredient text as uploaded, similar to user_recipe_ingredients

ALTER TABLE public.global_recipe_ingredients 
ADD COLUMN raw_name text;

-- Add comment to document the field
COMMENT ON COLUMN public.global_recipe_ingredients.raw_name IS 'Original ingredient text as uploaded (e.g., "2 cups all-purpose flour, sifted")';

-- Update existing records to have raw_name populated from the ingredients table
-- This is a one-time migration for existing data
UPDATE public.global_recipe_ingredients 
SET raw_name = CONCAT(
  COALESCE(amount || ' ', ''),
  COALESCE(unit || ' ', ''),
  i.name
)
FROM public.ingredients i 
WHERE global_recipe_ingredients.ingredient_id = i.ingredient_id
AND global_recipe_ingredients.raw_name IS NULL;

