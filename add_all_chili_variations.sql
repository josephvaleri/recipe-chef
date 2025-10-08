-- Add all chili/chile/chiles/chilies variations to two_word_ingredients table
-- This ensures all spelling variations can be found

INSERT INTO two_word_ingredients (ingredient_name)
VALUES 
  ('ancho chile'),
  ('ancho chiles'),
  ('ancho chilies'),
  ('guajillo chile'),
  ('guajillo chiles'),
  ('guajillo chilies'),
  ('pasilla chile'),
  ('pasilla chiles'),
  ('pasilla chilies')
ON CONFLICT (ingredient_name) DO NOTHING;

-- Verify the additions
SELECT ingredient_name 
FROM two_word_ingredients 
WHERE ingredient_name LIKE '%chil%'
ORDER BY ingredient_name;

