-- Add missing habanero ingredient to recipe 450
-- First, check if it already exists
SELECT 'Checking existing ingredients for recipe 450:' as info;
SELECT id, raw_name 
FROM global_recipe_ingredients 
WHERE recipe_id = 450 
ORDER BY id;

-- If the habanero ingredient is missing, add it
-- Adjust the ingredient_id if needed (find habanero pepper in ingredients table first)
DO $$
DECLARE
    habanero_id integer;
    recipe_450_id integer := 450;
BEGIN
    -- Find habanero pepper ingredient ID
    SELECT ingredient_id INTO habanero_id
    FROM ingredients 
    WHERE LOWER(name) LIKE '%habanero%'
    LIMIT 1;
    
    IF habanero_id IS NULL THEN
        RAISE NOTICE 'Habanero pepper not found in ingredients table. Creating it first.';
        
        -- Add habanero pepper to ingredients table if it doesn't exist
        -- Category 2 = Vegetables, adjust if needed
        INSERT INTO ingredients (name, category_id)
        VALUES ('Habanero Pepper', 2)
        RETURNING ingredient_id INTO habanero_id;
        
        RAISE NOTICE 'Created Habanero Pepper with ID: %', habanero_id;
    ELSE
        RAISE NOTICE 'Found Habanero Pepper with ID: %', habanero_id;
    END IF;
    
    -- Check if this ingredient already exists for recipe 450
    IF NOT EXISTS (
        SELECT 1 FROM global_recipe_ingredients 
        WHERE recipe_id = recipe_450_id 
        AND (
            LOWER(raw_name) LIKE '%habanero%' 
            OR LOWER(raw_name) LIKE '%amarillo%'
        )
    ) THEN
        -- Add the ingredient to recipe 450
        INSERT INTO global_recipe_ingredients (
            recipe_id, 
            ingredient_id, 
            amount, 
            unit,
            raw_name
        )
        VALUES (
            recipe_450_id,
            habanero_id,
            '1',
            NULL,
            '1 habanero pepper, seeded and chopped (or real Peruvian Aji Amarillo, if you can find it)'
        );
        
        RAISE NOTICE 'Added habanero ingredient to recipe 450';
    ELSE
        RAISE NOTICE 'Habanero ingredient already exists for recipe 450';
    END IF;
END $$;

-- Verify the addition
SELECT 'After insertion - checking recipe 450 ingredients:' as info;
SELECT id, raw_name 
FROM global_recipe_ingredients 
WHERE recipe_id = 450 
AND (LOWER(raw_name) LIKE '%habanero%' OR LOWER(raw_name) LIKE '%amarillo%')
ORDER BY id;



