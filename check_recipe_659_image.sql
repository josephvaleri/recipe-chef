-- Check recipe 659 image data
SELECT 'Checking recipe 659:' as info;
SELECT 
  user_recipe_id,
  title,
  image_url,
  source_name,
  source_url,
  created_at
FROM user_recipes
WHERE user_recipe_id = 659;

-- Check if there are any global recipes with this ID
SELECT 'Checking global recipes 659:' as info;
SELECT 
  recipe_id,
  title,
  image_url,
  source_name,
  source_url,
  created_at
FROM global_recipes
WHERE recipe_id = 659;

-- Check most recent user recipes to find the right one
SELECT 'Recent user recipes:' as info;
SELECT 
  user_recipe_id,
  title,
  image_url,
  source_url,
  created_at
FROM user_recipes
ORDER BY created_at DESC
LIMIT 10;
