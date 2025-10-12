-- Add missing fish and lime ingredients to the database

-- Check what exists currently
SELECT 'Checking for fish-related ingredients:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%fish%'
ORDER BY name;

SELECT 'Checking for lime:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%lime%'
ORDER BY name;

-- Add missing ingredients
DO $$
DECLARE
    white_fish_id integer;
    fish_fillets_id integer;
    fish_fillet_id integer;
    lime_id integer;
    protein_category_id integer := 1; -- Proteins category
    fruit_category_id integer := 3; -- Fruits category
BEGIN
    -- Check and add "White Fish"
    SELECT ingredient_id INTO white_fish_id
    FROM ingredients 
    WHERE LOWER(name) = 'white fish'
    LIMIT 1;
    
    IF white_fish_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('White Fish', protein_category_id)
        RETURNING ingredient_id INTO white_fish_id;
        RAISE NOTICE 'Created White Fish with ID: %', white_fish_id;
    ELSE
        RAISE NOTICE 'White Fish already exists with ID: %', white_fish_id;
    END IF;
    
    -- Check and add "Fish Fillets"
    SELECT ingredient_id INTO fish_fillets_id
    FROM ingredients 
    WHERE LOWER(name) = 'fish fillets'
    LIMIT 1;
    
    IF fish_fillets_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Fish Fillets', protein_category_id)
        RETURNING ingredient_id INTO fish_fillets_id;
        RAISE NOTICE 'Created Fish Fillets with ID: %', fish_fillets_id;
    ELSE
        RAISE NOTICE 'Fish Fillets already exists with ID: %', fish_fillets_id;
    END IF;
    
    -- Check and add "Fish Fillet" (singular)
    SELECT ingredient_id INTO fish_fillet_id
    FROM ingredients 
    WHERE LOWER(name) = 'fish fillet'
    LIMIT 1;
    
    IF fish_fillet_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Fish Fillet', protein_category_id)
        RETURNING ingredient_id INTO fish_fillet_id;
        RAISE NOTICE 'Created Fish Fillet with ID: %', fish_fillet_id;
    ELSE
        RAISE NOTICE 'Fish Fillet already exists with ID: %', fish_fillet_id;
    END IF;
    
    -- Check and add "Lime"
    SELECT ingredient_id INTO lime_id
    FROM ingredients 
    WHERE LOWER(name) = 'lime'
    LIMIT 1;
    
    IF lime_id IS NULL THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Lime', fruit_category_id)
        RETURNING ingredient_id INTO lime_id;
        RAISE NOTICE 'Created Lime with ID: %', lime_id;
    ELSE
        RAISE NOTICE 'Lime already exists with ID: %', lime_id;
    END IF;
    
    -- Add to two_word_ingredients if not exists
    IF NOT EXISTS (SELECT 1 FROM two_word_ingredients WHERE LOWER(ingredient_name) = 'white fish') THEN
        INSERT INTO two_word_ingredients (ingredient_name) VALUES ('white fish');
        RAISE NOTICE 'Added "white fish" to two_word_ingredients';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM two_word_ingredients WHERE LOWER(ingredient_name) = 'fish fillets') THEN
        INSERT INTO two_word_ingredients (ingredient_name) VALUES ('fish fillets');
        RAISE NOTICE 'Added "fish fillets" to two_word_ingredients';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM two_word_ingredients WHERE LOWER(ingredient_name) = 'fish fillet') THEN
        INSERT INTO two_word_ingredients (ingredient_name) VALUES ('fish fillet');
        RAISE NOTICE 'Added "fish fillet" to two_word_ingredients';
    END IF;
    
    -- Add common aliases
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'white fish fillets') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (white_fish_id, 'white fish fillets');
        RAISE NOTICE 'Added alias "white fish fillets" for White Fish';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ingredient_aliases WHERE LOWER(alias) = 'limes') THEN
        INSERT INTO ingredient_aliases (ingredient_id, alias) VALUES (lime_id, 'limes');
        RAISE NOTICE 'Added alias "limes" for Lime';
    END IF;
    
END $$;

-- Verify additions
SELECT 'After additions - Fish ingredients:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%fish%'
ORDER BY name;

SELECT 'After additions - Lime:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%lime%'
ORDER BY name;

SELECT 'Two-word ingredients:' as info;
SELECT * FROM two_word_ingredients 
WHERE LOWER(ingredient_name) LIKE '%fish%'
ORDER BY ingredient_name;

SELECT 'Aliases:' as info;
SELECT a.alias, i.name as ingredient_name
FROM ingredient_aliases a
JOIN ingredients i ON a.ingredient_id = i.ingredient_id
WHERE LOWER(a.alias) LIKE '%fish%' OR LOWER(a.alias) LIKE '%lime%'
ORDER BY a.alias;


