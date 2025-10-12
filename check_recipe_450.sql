-- Check global recipe 450 ingredients
SELECT 'Recipe 450 raw ingredients:' as info;
SELECT 
    gri.id,
    gri.recipe_id,
    gri.amount,
    gri.unit,
    gri.raw_name,
    i.name as ingredient_name
FROM global_recipe_ingredients gri
LEFT JOIN ingredients i ON gri.ingredient_id = i.ingredient_id
WHERE gri.recipe_id = 450
ORDER BY gri.id;

-- Check if the habanero ingredient exists in the raw_name field
SELECT 'Searching for habanero in recipe 450:' as info;
SELECT *
FROM global_recipe_ingredients 
WHERE recipe_id = 450 
AND (LOWER(raw_name) LIKE '%habanero%' OR LOWER(raw_name) LIKE '%amarillo%')
ORDER BY id;

-- Check all raw_name values to see if any have special characters
SELECT 'All raw ingredient lines for recipe 450:' as info;
SELECT 
    id,
    LENGTH(raw_name) as length,
    raw_name
FROM global_recipe_ingredients
WHERE recipe_id = 450
ORDER BY id;
