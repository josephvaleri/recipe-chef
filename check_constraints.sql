-- Check for constraints on user_recipe_ingredients
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_recipe_ingredients'::regclass;

-- Check for triggers
SELECT 
  tgname as trigger_name,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'user_recipe_ingredients'::regclass
  AND tgisinternal = false;

-- Check for unique indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_recipe_ingredients';
