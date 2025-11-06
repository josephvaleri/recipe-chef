-- Add missing seafood ingredients

-- Check what exists currently
SELECT 'Checking for squid/calamari:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%squid%' OR LOWER(name) LIKE '%calamari%'
ORDER BY name;

SELECT 'Checking for other seafood:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) IN ('octopus', 'clams', 'mussels', 'oysters', 'scallops')
ORDER BY name;

-- Add missing ingredients
DO $$
DECLARE
    squid_id integer;
    octopus_id integer;
    clams_id integer;
    mussels_id integer;
    oysters_id integer;
    scallops_id integer;
    protein_category_id integer := 1; -- Proteins category
BEGIN
    -- Check and add "Squid"
    SELECT ingredient_id INTO squid_id
    FROM ingredients 
    WHERE LOWER(name) = 'squid'
    LIMIT 1;
    
    IF squid_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Squid', protein_category_id)
        RETURNING ingredient_id INTO squid_id;
        RAISE NOTICE 'Created Squid with ID: %', squid_id;
    ELSE
        RAISE NOTICE 'Squid already exists with ID: %', squid_id;
    END IF;
    
    -- Check and add "Octopus"
    SELECT ingredient_id INTO octopus_id
    FROM ingredients 
    WHERE LOWER(name) = 'octopus'
    LIMIT 1;
    
    IF octopus_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Octopus', protein_category_id)
        RETURNING ingredient_id INTO octopus_id;
        RAISE NOTICE 'Created Octopus with ID: %', octopus_id;
    ELSE
        RAISE NOTICE 'Octopus already exists with ID: %', octopus_id;
    END IF;
    
    -- Check and add "Clams"
    SELECT ingredient_id INTO clams_id
    FROM ingredients 
    WHERE LOWER(name) = 'clams'
    LIMIT 1;
    
    IF clams_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Clams', protein_category_id)
        RETURNING ingredient_id INTO clams_id;
        RAISE NOTICE 'Created Clams with ID: %', clams_id;
    ELSE
        RAISE NOTICE 'Clams already exists with ID: %', clams_id;
    END IF;
    
    -- Check and add "Mussels"
    SELECT ingredient_id INTO mussels_id
    FROM ingredients 
    WHERE LOWER(name) = 'mussels'
    LIMIT 1;
    
    IF mussels_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Mussels', protein_category_id)
        RETURNING ingredient_id INTO mussels_id;
        RAISE NOTICE 'Created Mussels with ID: %', mussels_id;
    ELSE
        RAISE NOTICE 'Mussels already exists with ID: %', mussels_id;
    END IF;
    
    -- Check and add "Oysters"
    SELECT ingredient_id INTO oysters_id
    FROM ingredients 
    WHERE LOWER(name) = 'oysters'
    LIMIT 1;
    
    IF oysters_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Oysters', protein_category_id)
        RETURNING ingredient_id INTO oysters_id;
        RAISE NOTICE 'Created Oysters with ID: %', oysters_id;
    ELSE
        RAISE NOTICE 'Oysters already exists with ID: %', oysters_id;
    END IF;
    
    -- Check and add "Scallops"
    SELECT ingredient_id INTO scallops_id
    FROM ingredients 
    WHERE LOWER(name) = 'scallops'
    LIMIT 1;
    
    IF scallops_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Scallops', protein_category_id)
        RETURNING ingredient_id INTO scallops_id;
        RAISE NOTICE 'Created Scallops with ID: %', scallops_id;
    ELSE
        RAISE NOTICE 'Scallops already exists with ID: %', scallops_id;
    END IF;
    
    -- Add common aliases
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'calamari') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (squid_id, 'calamari');
        RAISE NOTICE 'Added alias "calamari" for Squid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'squid bodies') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (squid_id, 'squid bodies');
        RAISE NOTICE 'Added alias "squid bodies" for Squid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'squid rings') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (squid_id, 'squid rings');
        RAISE NOTICE 'Added alias "squid rings" for Squid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'clam') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (clams_id, 'clam');
        RAISE NOTICE 'Added alias "clam" for Clams';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'mussel') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (mussels_id, 'mussel');
        RAISE NOTICE 'Added alias "mussel" for Mussels';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'oyster') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (oysters_id, 'oyster');
        RAISE NOTICE 'Added alias "oyster" for Oysters';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'scallop') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (scallops_id, 'scallop');
        RAISE NOTICE 'Added alias "scallop" for Scallops';
    END IF;
    
END $$;

-- Verify additions
SELECT 'After additions - All seafood:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) IN ('squid', 'octopus', 'clams', 'mussels', 'oysters', 'scallops')
ORDER BY name;

SELECT 'Aliases:' as info;
SELECT a.alias, i.name as ingredient_name
FROM ingredient_aliases a
JOIN ingredients i ON a.ingredient_id = i.ingredient_id
WHERE LOWER(a.alias) LIKE '%squid%' 
   OR LOWER(a.alias) LIKE '%calamari%'
   OR LOWER(a.alias) IN ('clam', 'mussel', 'oyster', 'scallop')
ORDER BY a.alias;








