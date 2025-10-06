-- Check the user recipe 1286 and its ingredients
SELECT 
    ur.user_recipe_id,
    ur.title,
    urd.ingredient_id,
    i.name as ingredient_name,
    i.category_id,
    ic.name as category_name
FROM user_recipes ur
LEFT JOIN user_recipe_ingredients_detail urd ON ur.user_recipe_id = urd.user_recipe_id
LEFT JOIN ingredients i ON urd.ingredient_id = i.ingredient_id
LEFT JOIN ingredient_categories ic ON i.category_id = ic.category_id
WHERE ur.user_recipe_id = 1286;

-- Check what ingredient IDs Pancetta and Bucatini have
SELECT 
    ingredient_id,
    name,
    category_id
FROM ingredients 
WHERE name ILIKE '%pancetta%' OR name ILIKE '%bucatini%';

-- Check what category IDs are being selected in the search
SELECT 
    category_id,
    name
FROM ingredient_categories
WHERE category_id IN (1, 2, 3, 4, 5, 6, 7);
