-- Migration: Add user_recipe_ingredient_id FK to link detail table with amounts/units
-- This allows the shopping list to include quantities for each ingredient

-- Step 1: Add the foreign key column (nullable initially for existing records)
ALTER TABLE user_recipe_ingredients_detail 
ADD COLUMN IF NOT EXISTS user_recipe_ingredient_id BIGINT;

-- Step 2: Add the foreign key constraint (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_user_recipe_ingredient'
  ) THEN
    ALTER TABLE user_recipe_ingredients_detail
    ADD CONSTRAINT fk_user_recipe_ingredient
    FOREIGN KEY (user_recipe_ingredient_id) 
    REFERENCES user_recipe_ingredients(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Created constraint fk_user_recipe_ingredient';
  ELSE
    RAISE NOTICE 'Constraint fk_user_recipe_ingredient already exists, skipping';
  END IF;
END $$;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_recipe_ingredients_detail_ingredient_fk 
ON user_recipe_ingredients_detail(user_recipe_ingredient_id);

-- Step 4: Try to match existing records (best effort based on text similarity)
-- This attempts to link detail records to their source ingredient rows
UPDATE user_recipe_ingredients_detail detail
SET user_recipe_ingredient_id = subq.ingredient_id
FROM (
  SELECT DISTINCT ON (detail.detail_id)
    detail.detail_id,
    ing.id as ingredient_id,
    -- Calculate similarity score
    CASE
      WHEN LOWER(TRIM(ing.raw_name)) = LOWER(TRIM(detail.matched_term)) THEN 100
      WHEN detail.original_text LIKE '%' || ing.raw_name || '%' THEN 80
      WHEN ing.raw_name LIKE '%' || detail.matched_term || '%' THEN 70
      WHEN LOWER(ing.raw_name) LIKE LOWER('%' || detail.matched_term || '%') THEN 60
      ELSE 0
    END as score
  FROM user_recipe_ingredients_detail detail
  JOIN user_recipe_ingredients ing ON detail.user_recipe_id = ing.user_recipe_id
  WHERE detail.user_recipe_ingredient_id IS NULL
  ORDER BY detail.detail_id, score DESC
) subq
WHERE detail.detail_id = subq.detail_id
  AND subq.score >= 60
  AND detail.user_recipe_ingredient_id IS NULL;

-- Step 5: Report on unmatched records
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM user_recipe_ingredients_detail
  WHERE user_recipe_ingredient_id IS NULL;
  
  IF unmatched_count > 0 THEN
    RAISE NOTICE 'Warning: % detail records could not be automatically matched to ingredient rows', unmatched_count;
    RAISE NOTICE 'These will need to be re-analyzed or manually linked';
  ELSE
    RAISE NOTICE 'Success: All detail records have been linked to ingredient rows';
  END IF;
END $$;

-- Optional: Add a check to see which recipes need re-analysis
SELECT 
  ur.user_recipe_id,
  ur.title,
  COUNT(DISTINCT uri.id) as total_ingredients,
  COUNT(DISTINCT urid.detail_id) as matched_ingredients,
  COUNT(DISTINCT CASE WHEN urid.user_recipe_ingredient_id IS NULL THEN urid.detail_id END) as unlinked_matches
FROM user_recipes ur
LEFT JOIN user_recipe_ingredients uri ON ur.user_recipe_id = uri.user_recipe_id
LEFT JOIN user_recipe_ingredients_detail urid ON ur.user_recipe_id = urid.user_recipe_id
GROUP BY ur.user_recipe_id, ur.title
HAVING COUNT(DISTINCT CASE WHEN urid.user_recipe_ingredient_id IS NULL THEN urid.detail_id END) > 0
ORDER BY ur.title;

