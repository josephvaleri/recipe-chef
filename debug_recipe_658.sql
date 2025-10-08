-- Debug why recipe 658 ingredients weren't matched
-- Run this in your Supabase SQL editor

-- 1. Check what raw ingredients exist for recipe 658
SELECT 
  'Raw ingredients for recipe 658' as step,
  uri.raw_name,
  uri.amount,
  uri.unit
FROM public.user_recipe_ingredients uri
WHERE uri.user_recipe_id = 658
ORDER BY uri.raw_name;

-- 2. Check what detailed ingredients were found for recipe 658
SELECT 
  'Detailed ingredients for recipe 658' as step,
  urid.original_text,
  urid.matched_term,
  urid.match_type,
  urid.matched_alias,
  i.name as ingredient_name,
  ic.name as category_name
FROM public.user_recipe_ingredients_detail urid
LEFT JOIN public.ingredients i ON i.ingredient_id = urid.ingredient_id
LEFT JOIN public.ingredient_categories ic ON ic.category_id = i.category_id
WHERE urid.user_recipe_id = 658
ORDER BY urid.original_text;

-- 3. Check if the missing ingredients exist in the ingredients table
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
