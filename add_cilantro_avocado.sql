-- Add missing cilantro and avocado ingredients

-- Check what exists currently
SELECT 'Checking for cilantro/coriander:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%cilantro%' OR LOWER(name) LIKE '%coriander%'
ORDER BY name;

SELECT 'Checking for avocado:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%avocado%'
ORDER BY name;

-- Add missing ingredients
DO $$
DECLARE
    cilantro_id integer;
    avocado_id integer;
    herb_category_id integer := 6; -- Spices/Herbs category
    vegetable_category_id integer := 2; -- Vegetables category
BEGIN
    -- Check and add "Cilantro"
    SELECT ingredient_id INTO cilantro_id
    FROM ingredients 
    WHERE LOWER(name) = 'cilantro'
    LIMIT 1;
    
    IF cilantro_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Cilantro', herb_category_id)
        RETURNING ingredient_id INTO cilantro_id;
        RAISE NOTICE 'Created Cilantro with ID: %', cilantro_id;
    ELSE
        RAISE NOTICE 'Cilantro already exists with ID: %', cilantro_id;
    END IF;
    
    -- Check and add "Avocado"
    SELECT ingredient_id INTO avocado_id
    FROM ingredients 
    WHERE LOWER(name) = 'avocado'
    LIMIT 1;
    
    IF avocado_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Avocado', vegetable_category_id)
        RETURNING ingredient_id INTO avocado_id;
        RAISE NOTICE 'Created Avocado with ID: %', avocado_id;
    ELSE
        RAISE NOTICE 'Avocado already exists with ID: %', avocado_id;
    END IF;
    
    -- Add common aliases
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'avocados') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (avocado_id, 'avocados');
        RAISE NOTICE 'Added alias "avocados" for Avocado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'fresh cilantro') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (cilantro_id, 'fresh cilantro');
        RAISE NOTICE 'Added alias "fresh cilantro" for Cilantro';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'coriander') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (cilantro_id, 'coriander');
        RAISE NOTICE 'Added alias "coriander" for Cilantro';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'coriander leaves') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (cilantro_id, 'coriander leaves');
        RAISE NOTICE 'Added alias "coriander leaves" for Cilantro';
    END IF;
    
END $$;

-- Verify additions
SELECT 'After additions - Cilantro:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%cilantro%' OR LOWER(name) LIKE '%coriander%'
ORDER BY name;

SELECT 'After additions - Avocado:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%avocado%'
ORDER BY name;

SELECT 'Aliases:' as info;
SELECT a.alias, i.name as ingredient_name
FROM ingredient_aliases a
JOIN ingredients i ON a.ingredient_id = i.ingredient_id
WHERE LOWER(a.alias) LIKE '%cilantro%' 
   OR LOWER(a.alias) LIKE '%coriander%' 
   OR LOWER(a.alias) LIKE '%avocado%'
ORDER BY a.alias;


