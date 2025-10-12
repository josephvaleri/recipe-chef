-- Check recipe 1301
SELECT 
  user_recipe_id,
  title,
  created_at
FROM user_recipes 
WHERE user_recipe_id = 1301;

-- Check how many ingredient rows
SELECT COUNT(*) as ingredient_count
FROM user_recipe_ingredients 
WHERE user_recipe_id = 1301;

-- Check the actual ingredient data
SELECT 
  id,
  amount,
  unit,
  raw_name,
  LENGTH(raw_name) as name_length
FROM user_recipe_ingredients 
WHERE user_recipe_id = 1301
ORDER BY id;
