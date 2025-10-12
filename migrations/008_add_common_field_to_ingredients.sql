-- Migration: Add 'common' field to ingredients table
-- This allows us to mark commonly used ingredients for better UX in Recipe Finder

-- Add the common column (defaults to false for existing ingredients)
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS common BOOLEAN DEFAULT false;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_ingredients_common ON ingredients(common);

-- Optionally mark some very common ingredients as true
-- You can run this section or manually mark ingredients via admin interface
UPDATE ingredients 
SET common = true 
WHERE name IN (
  'Salt',
  'Black Pepper',
  'Olive Oil',
  'Butter',
  'Garlic',
  'Onion',
  'All-Purpose Flour',
  'Sugar',
  'Eggs',
  'Milk',
  'Water',
  'Chicken Breast',
  'Ground Beef',
  'Rice',
  'Pasta',
  'Tomatoes',
  'Chicken Broth',
  'Vegetable Oil',
  'Soy Sauce',
  'Lemon',
  'Parmesan Cheese',
  'Mozzarella Cheese',
  'Heavy Cream',
  'Carrots',
  'Celery',
  'Potatoes',
  'Basil',
  'Oregano',
  'Thyme',
  'Parsley',
  'Red Pepper Flakes',
  'Cumin',
  'Paprika',
  'Cinnamon',
  'Vanilla Extract',
  'Baking Powder',
  'Baking Soda',
  'Brown Sugar',
  'Honey',
  'Ginger'
);

-- Log the results
DO $$
DECLARE
  common_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO common_count FROM ingredients WHERE common = true;
  SELECT COUNT(*) INTO total_count FROM ingredients;
  
  RAISE NOTICE 'Migration complete: % common ingredients out of % total', common_count, total_count;
END $$;

