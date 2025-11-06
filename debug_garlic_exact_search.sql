-- Debug why "garlic" didn't match "Garlic" (ingredient_id=8)

-- 1. Check the exact value in the database
SELECT 
  ingredient_id,
  name,
  LENGTH(name) as name_length,
  ASCII(SUBSTRING(name, 1, 1)) as first_char_ascii,
  ASCII(SUBSTRING(name, 2, 1)) as second_char_ascii
FROM public.ingredients 
WHERE ingredient_id = 8;

-- 2. Test exact case-insensitive match
SELECT 
  ingredient_id,
  name
FROM public.ingredients 
WHERE LOWER(name) = LOWER('garlic');

-- 3. Test ILIKE exact match
SELECT 
  ingredient_id,
  name
FROM public.ingredients 
WHERE name ILIKE 'garlic';

-- 4. Test if there are any hidden characters or spaces
SELECT 
  ingredient_id,
  name,
  LENGTH(name) as name_length,
  name ~ '^[A-Za-z\s]+$' as is_alpha_only
FROM public.ingredients 
WHERE ingredient_id = 8;








