-- Check what ingredients actually exist in the database
-- Run this in your Supabase SQL editor

-- 1. Check total count of ingredients
SELECT 
  'Total ingredients' as type,
  COUNT(*) as count
FROM public.ingredients;

-- 2. Search for the specific ingredients we need
SELECT 
  'Searching for Carrot' as search_term,
  i.ingredient_id,
  i.name,
  ic.name as category_name
FROM public.ingredients i
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE LOWER(i.name) LIKE '%carrot%'

UNION ALL

SELECT 
  'Searching for Onion' as search_term,
  i.ingredient_id,
  i.name,
  ic.name as category_name
FROM public.ingredients i
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE LOWER(i.name) LIKE '%onion%'

UNION ALL

SELECT 
  'Searching for Celery' as search_term,
  i.ingredient_id,
  i.name,
  ic.name as category_name
FROM public.ingredients i
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE LOWER(i.name) LIKE '%celery%'

UNION ALL

SELECT 
  'Searching for Pancetta' as search_term,
  i.ingredient_id,
  i.name,
  ic.name as category_name
FROM public.ingredients i
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE LOWER(i.name) LIKE '%pancetta%'

UNION ALL

SELECT 
  'Searching for Garlic' as search_term,
  i.ingredient_id,
  i.name,
  ic.name as category_name
FROM public.ingredients i
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE LOWER(i.name) LIKE '%garlic%'

ORDER BY search_term, name;

-- 3. Show some sample ingredients to see what's in the database
SELECT 
  'Sample ingredients' as type,
  i.ingredient_id,
  i.name,
  ic.name as category_name
FROM public.ingredients i
JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
ORDER BY i.name
LIMIT 20;
