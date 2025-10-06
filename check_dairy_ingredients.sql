-- Check all ingredients with Dairy category
SELECT 
    i.ingredient_id,
    i.name,
    ic.name as category_name,
    ic.category_id
FROM ingredients i
JOIN ingredient_categories ic ON i.category_id = ic.category_id
WHERE ic.name ILIKE '%dairy%' OR ic.name ILIKE '%milk%' OR ic.name ILIKE '%cheese%'
ORDER BY i.name;

-- Check all ingredient categories to see what's available
SELECT 
    category_id,
    name
FROM ingredient_categories
ORDER BY category_id;

-- Check ingredients by category_id 5 (assuming Dairy is category 5)
SELECT 
    i.ingredient_id,
    i.name,
    ic.name as category_name
FROM ingredients i
JOIN ingredient_categories ic ON i.category_id = ic.category_id
WHERE i.category_id = 5
ORDER BY i.name;
