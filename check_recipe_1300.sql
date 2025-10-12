-- Check recipe 1300
SELECT 
  user_recipe_id,
  title,
  created_at
FROM user_recipes 
WHERE user_recipe_id = 1300;

-- Check ingredients
SELECT 
  id,
  user_recipe_id,
  amount,
  unit,
  raw_name,
  ingredient_id
FROM user_recipe_ingredients 
WHERE user_recipe_id = 1300
ORDER BY id;

-- Check detail analysis
SELECT 
  detail_id,
  user_recipe_id,
  ingredient_id,
  original_text,
  matched_term
FROM user_recipe_ingredients_detail
WHERE user_recipe_id = 1300
ORDER BY detail_id;
