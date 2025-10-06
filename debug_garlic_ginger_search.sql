-- Debug why "garlic" and "ginger" weren't found in ingredient search

-- 1. Check if "garlic" exists in ingredients table
SELECT 
  ingredient_id,
  name,
  category_id
FROM public.ingredients 
WHERE LOWER(name) LIKE '%garlic%';

-- 2. Check if "ginger" exists in ingredients table  
SELECT 
  ingredient_id,
  name,
  category_id
FROM public.ingredients 
WHERE LOWER(name) LIKE '%ginger%';

-- 3. Check if "garlic" exists in ingredient_aliases table
SELECT 
  alias_id,
  alias,
  ingredient_id,
  i.name as ingredient_name
FROM public.ingredient_aliases ia
LEFT JOIN public.ingredients i ON ia.ingredient_id = i.ingredient_id
WHERE LOWER(ia.alias) LIKE '%garlic%';

-- 4. Check if "ginger" exists in ingredient_aliases table
SELECT 
  alias_id,
  alias,
  ingredient_id,
  i.name as ingredient_name
FROM public.ingredient_aliases ia
LEFT JOIN public.ingredients i ON ia.ingredient_id = i.ingredient_id
WHERE LOWER(ia.alias) LIKE '%ginger%';

-- 5. Test the parsing logic - what would be extracted from these ingredient lines?
-- "5 cloves garlic, smashed and finely chopped" should extract "garlic"
-- "One 2-inch piece ginger, peeled and grated" should extract "ginger"
