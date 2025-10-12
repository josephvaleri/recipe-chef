-- Test alias matching for tomatoes
-- Check if "2 cups crushed tomatoes" should match "tomatoes" alias
SELECT 
    alias,
    ingredient_id,
    CASE 
        WHEN '2 cups crushed tomatoes' ILIKE '%' || alias || '%' THEN 'MATCH'
        ELSE 'NO MATCH'
    END as direct_match,
    CASE 
        WHEN alias ILIKE '%tomatoes%' THEN 'ALIAS_CONTAINS_TOMATOES'
        ELSE 'NO'
    END as alias_contains_tomatoes
FROM ingredient_aliases 
WHERE alias ILIKE '%tomato%' 
ORDER BY alias;





