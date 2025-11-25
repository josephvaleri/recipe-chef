-- Migration: Add calories field to user_recipes and global_recipes tables
-- This allows storing estimated calories for recipes

-- Add calories column to global_recipes table
ALTER TABLE global_recipes 
ADD COLUMN IF NOT EXISTS calories INTEGER;

-- Add calories column to user_recipes table
ALTER TABLE user_recipes 
ADD COLUMN IF NOT EXISTS calories INTEGER;

-- Add index for faster filtering/sorting by calories (optional but useful)
CREATE INDEX IF NOT EXISTS idx_global_recipes_calories ON global_recipes(calories) WHERE calories IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_recipes_calories ON user_recipes(calories) WHERE calories IS NOT NULL;

-- Log the results
DO $$
DECLARE
  global_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO global_count FROM global_recipes WHERE calories IS NOT NULL;
  SELECT COUNT(*) INTO user_count FROM user_recipes WHERE calories IS NOT NULL;
  
  RAISE NOTICE 'Migration complete: Added calories column to both tables';
  RAISE NOTICE 'Global recipes with calories: %', global_count;
  RAISE NOTICE 'User recipes with calories: %', user_count;
END $$;

