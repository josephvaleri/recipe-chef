-- Add shallot alias to map to the same ingredient as banana shallot
-- First check if it already exists, then insert if not
INSERT INTO ingredient_aliases (alias, ingredient_id, locale)
SELECT 'shallot', 2831, 'en'
WHERE NOT EXISTS (
    SELECT 1 FROM ingredient_aliases WHERE alias_ci = 'shallot'
);
