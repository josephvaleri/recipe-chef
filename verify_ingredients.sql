-- Check if these ingredients exist in the database
SELECT 'Checking for Orange:' as query;
SELECT ingredient_id, name, category_id FROM ingredients WHERE LOWER(name) LIKE '%orange%' LIMIT 5;

SELECT 'Checking for Lemon:' as query;
SELECT ingredient_id, name, category_id FROM ingredients WHERE LOWER(name) LIKE '%lemon%' LIMIT 5;

SELECT 'Checking for Chicken:' as query;
SELECT ingredient_id, name, category_id FROM ingredients WHERE LOWER(name) LIKE '%chicken%' LIMIT 5;

SELECT 'Checking for Broth:' as query;
SELECT ingredient_id, name, category_id FROM ingredients WHERE LOWER(name) LIKE '%broth%' LIMIT 5;

SELECT 'Checking for Chicken Broth:' as query;
SELECT ingredient_id, name, category_id FROM ingredients WHERE LOWER(name) LIKE '%chicken%broth%' OR LOWER(name) LIKE '%broth%chicken%' LIMIT 5;

SELECT 'Checking two_word_ingredients for chicken broth:' as query;
SELECT * FROM two_word_ingredients WHERE LOWER(ingredient_name) LIKE '%chicken%broth%' OR LOWER(ingredient_name) LIKE '%broth%chicken%' LIMIT 5;
