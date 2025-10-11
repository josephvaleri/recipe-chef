-- Migration: Add global_recipe_ingredient_id FK to global_recipe_ingredients_detail
-- This mirrors the user_recipe_ingredients_detail FK structure

-- Step 1: Add the foreign key column (nullable initially for existing records)
ALTER TABLE global_recipe_ingredients_detail 
ADD COLUMN IF NOT EXISTS global_recipe_ingredient_id BIGINT;

-- Step 2: Add the foreign key constraint
ALTER TABLE global_recipe_ingredients_detail
ADD CONSTRAINT fk_global_recipe_ingredient
FOREIGN KEY (global_recipe_ingredient_id) 
REFERENCES global_recipe_ingredients(id) 
ON DELETE CASCADE;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_global_recipe_ingredients_detail_ingredient_fk 
ON global_recipe_ingredients_detail(global_recipe_ingredient_id);

-- Step 4: Try to match existing records (best effort based on text similarity)
UPDATE global_recipe_ingredients_detail detail
SET global_recipe_ingredient_id = subq.ingredient_id
FROM (
  SELECT DISTINCT ON (detail.id)
    detail.id as detail_id,
    gri.id as ingredient_id,
    -- Calculate similarity score
    CASE
      WHEN detail.ingredient_id = gri.ingredient_id THEN 100
      WHEN LOWER(TRIM(detail.matched_term)) = (
        SELECT LOWER(name) FROM ingredients WHERE ingredient_id = gri.ingredient_id
      ) THEN 90
      ELSE 0
    END as score
  FROM global_recipe_ingredients_detail detail
  JOIN global_recipe_ingredients gri ON detail.recipe_id = gri.recipe_id
  WHERE detail.global_recipe_ingredient_id IS NULL
  ORDER BY detail.id, score DESC
) subq
WHERE detail.id = subq.detail_id
  AND subq.score >= 90
  AND detail.global_recipe_ingredient_id IS NULL;

-- Step 5: Report on unmatched records
DO $$
DECLARE
  unmatched_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM global_recipe_ingredients_detail;
  SELECT COUNT(*) INTO unmatched_count
  FROM global_recipe_ingredients_detail
  WHERE global_recipe_ingredient_id IS NULL;
  
  RAISE NOTICE 'Total global recipe ingredient detail records: %', total_count;
  RAISE NOTICE 'Records with FK linked: %', total_count - unmatched_count;
  RAISE NOTICE 'Records with NULL FK: %', unmatched_count;
  
  IF unmatched_count > 0 THEN
    RAISE NOTICE 'Warning: % detail records could not be automatically matched', unmatched_count;
    RAISE NOTICE 'These need to be re-analyzed or manually linked';
  ELSE
    RAISE NOTICE 'Success: All detail records have been linked!';
  END IF;
END $$;

-- Step 6: List affected global recipes
SELECT 
  gr.recipe_id,
  gr.title,
  COUNT(DISTINCT gri.id) as total_ingredients,
  COUNT(DISTINCT grid.id) as matched_ingredients,
  COUNT(DISTINCT CASE WHEN grid.global_recipe_ingredient_id IS NULL THEN grid.id END) as unlinked_matches
FROM global_recipes gr
LEFT JOIN global_recipe_ingredients gri ON gr.recipe_id = gri.recipe_id
LEFT JOIN global_recipe_ingredients_detail grid ON gr.recipe_id = grid.recipe_id
GROUP BY gr.recipe_id, gr.title
HAVING COUNT(DISTINCT CASE WHEN grid.global_recipe_ingredient_id IS NULL THEN grid.id END) > 0
ORDER BY gr.title;

