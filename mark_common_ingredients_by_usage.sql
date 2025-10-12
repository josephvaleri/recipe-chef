-- Mark the top 20% most frequently used ingredients per category as 'common'
-- Based on actual usage in global_recipe_ingredients_detail table

-- First, reset all to false
UPDATE ingredients SET common = false;

-- Mark top 20% ingredients for PROTEINS (category_id = 1)
WITH category_count AS (
  SELECT COUNT(*) as total FROM ingredients WHERE category_id = 1
),
top_proteins AS (
  SELECT ingredient_id, COUNT(*) as usage_count
  FROM global_recipe_ingredients_detail
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM ingredients WHERE category_id = 1
  )
  GROUP BY ingredient_id
  ORDER BY usage_count DESC
  LIMIT (SELECT GREATEST(30, CEIL(total * 0.20)) FROM category_count)
)
UPDATE ingredients
SET common = true
WHERE ingredient_id IN (SELECT ingredient_id FROM top_proteins);

-- Mark top 20% ingredients for VEGETABLES (category_id = 2)
WITH category_count AS (
  SELECT COUNT(*) as total FROM ingredients WHERE category_id = 2
),
top_vegetables AS (
  SELECT ingredient_id, COUNT(*) as usage_count
  FROM global_recipe_ingredients_detail
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM ingredients WHERE category_id = 2
  )
  GROUP BY ingredient_id
  ORDER BY usage_count DESC
  LIMIT (SELECT GREATEST(30, CEIL(total * 0.20)) FROM category_count)
)
UPDATE ingredients
SET common = true
WHERE ingredient_id IN (SELECT ingredient_id FROM top_vegetables);

-- Mark top 20% ingredients for FRUITS (category_id = 3)
WITH category_count AS (
  SELECT COUNT(*) as total FROM ingredients WHERE category_id = 3
),
top_fruits AS (
  SELECT ingredient_id, COUNT(*) as usage_count
  FROM global_recipe_ingredients_detail
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM ingredients WHERE category_id = 3
  )
  GROUP BY ingredient_id
  ORDER BY usage_count DESC
  LIMIT (SELECT GREATEST(30, CEIL(total * 0.20)) FROM category_count)
)
UPDATE ingredients
SET common = true
WHERE ingredient_id IN (SELECT ingredient_id FROM top_fruits);

-- Mark top 20% ingredients for GRAINS (category_id = 4)
WITH category_count AS (
  SELECT COUNT(*) as total FROM ingredients WHERE category_id = 4
),
top_grains AS (
  SELECT ingredient_id, COUNT(*) as usage_count
  FROM global_recipe_ingredients_detail
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM ingredients WHERE category_id = 4
  )
  GROUP BY ingredient_id
  ORDER BY usage_count DESC
  LIMIT (SELECT GREATEST(30, CEIL(total * 0.20)) FROM category_count)
)
UPDATE ingredients
SET common = true
WHERE ingredient_id IN (SELECT ingredient_id FROM top_grains);

-- Mark top 20% ingredients for SPICES & HERBS (category_id = 6)
WITH category_count AS (
  SELECT COUNT(*) as total FROM ingredients WHERE category_id = 6
),
top_spices AS (
  SELECT ingredient_id, COUNT(*) as usage_count
  FROM global_recipe_ingredients_detail
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM ingredients WHERE category_id = 6
  )
  GROUP BY ingredient_id
  ORDER BY usage_count DESC
  LIMIT (SELECT GREATEST(30, CEIL(total * 0.20)) FROM category_count)
)
UPDATE ingredients
SET common = true
WHERE ingredient_id IN (SELECT ingredient_id FROM top_spices);

-- Mark top 20% ingredients for DAIRY (category_id = 7)
WITH category_count AS (
  SELECT COUNT(*) as total FROM ingredients WHERE category_id = 7
),
top_dairy AS (
  SELECT ingredient_id, COUNT(*) as usage_count
  FROM global_recipe_ingredients_detail
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM ingredients WHERE category_id = 7
  )
  GROUP BY ingredient_id
  ORDER BY usage_count DESC
  LIMIT (SELECT GREATEST(30, CEIL(total * 0.20)) FROM category_count)
)
UPDATE ingredients
SET common = true
WHERE ingredient_id IN (SELECT ingredient_id FROM top_dairy);

-- Show summary
SELECT 
  ic.name AS category,
  COUNT(*) AS common_count,
  (SELECT COUNT(*) FROM ingredients WHERE category_id = ic.category_id) AS total_count
FROM ingredients i
JOIN ingredient_categories ic ON i.category_id = ic.category_id
WHERE i.common = true
GROUP BY ic.category_id, ic.name
ORDER BY ic.category_id;

-- Overall summary
SELECT 
  COUNT(*) FILTER (WHERE common = true) AS total_common,
  COUNT(*) AS total_ingredients,
  ROUND(COUNT(*) FILTER (WHERE common = true) * 100.0 / COUNT(*), 1) AS percent_common
FROM ingredients;

