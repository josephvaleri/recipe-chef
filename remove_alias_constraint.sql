-- Remove the constraint that prevents aliases from being the same as canonical names
-- First, drop the trigger that depends on the function
DROP TRIGGER IF EXISTS trg_alias_not_canonical ON ingredient_aliases;

-- Then drop the function that enforces this constraint
DROP FUNCTION IF EXISTS fn_alias_not_canonical();

-- Then add the aliases for ingredient_id=9 (Tomatoes) - only if they don't exist
INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES 
(9, 'tomatoes')
ON CONFLICT (alias_ci, locale) DO NOTHING;
