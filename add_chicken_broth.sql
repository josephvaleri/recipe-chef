-- Check what chicken-related ingredients exist
SELECT 'Current chicken ingredients:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%chicken%' 
ORDER BY name;

SELECT 'Current broth ingredients:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%broth%' 
ORDER BY name;

SELECT 'Checking two_word_ingredients:' as info;
SELECT * FROM two_word_ingredients 
WHERE LOWER(ingredient_name) LIKE '%chicken%' OR LOWER(ingredient_name) LIKE '%broth%'
ORDER BY ingredient_name;

-- Add chicken broth if it doesn't exist (category 1 = Proteins, or adjust as needed)
-- First check if it exists
DO $$
DECLARE
    chicken_broth_exists boolean;
    ingredient_category_id integer;
BEGIN
    -- Check if chicken broth exists
    SELECT EXISTS (
        SELECT 1 FROM ingredients WHERE LOWER(name) = 'chicken broth'
    ) INTO chicken_broth_exists;
    
    IF NOT chicken_broth_exists THEN
        -- Try to find the right category (look for similar items)
        SELECT category_id INTO ingredient_category_id
        FROM ingredients 
        WHERE LOWER(name) LIKE '%broth%' 
        LIMIT 1;
        
        -- If no broth found, default to category 5 (Other/Condiments) or 1 (Proteins)
        IF ingredient_category_id IS NULL THEN
            ingredient_category_id := 5; -- Or use 1 for proteins
        END IF;
        
        RAISE NOTICE 'Adding Chicken Broth to category %', ingredient_category_id;
        
        INSERT INTO ingredients (name, category_id)
        VALUES ('Chicken Broth', ingredient_category_id);
        
        RAISE NOTICE 'Added Chicken Broth successfully';
    ELSE
        RAISE NOTICE 'Chicken Broth already exists';
    END IF;
    
    -- Also add to two_word_ingredients
    IF NOT EXISTS (SELECT 1 FROM two_word_ingredients WHERE LOWER(ingredient_name) = 'chicken broth') THEN
        INSERT INTO two_word_ingredients (ingredient_name)
        VALUES ('chicken broth');
        RAISE NOTICE 'Added chicken broth to two_word_ingredients';
    END IF;
    
    -- Add roasting chicken if needed
    IF NOT EXISTS (SELECT 1 FROM ingredients WHERE LOWER(name) = 'chicken') THEN
        INSERT INTO ingredients (name, category_id)
        VALUES ('Chicken', 1); -- Category 1 = Proteins
        RAISE NOTICE 'Added Chicken to ingredients';
    END IF;
END $$;

-- Verify additions
SELECT 'After additions - Chicken Broth:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) LIKE '%chicken%broth%' OR LOWER(name) = 'chicken broth';

SELECT 'After additions - Chicken:' as info;
SELECT ingredient_id, name, category_id 
FROM ingredients 
WHERE LOWER(name) = 'chicken';
