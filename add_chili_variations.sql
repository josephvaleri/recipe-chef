-- Add all variations of chili/chile/chiles/chilies to two_word_ingredients
INSERT INTO two_word_ingredients (ingredient_name)
VALUES 
  ('ancho chile'),
  ('ancho chiles'),
  ('ancho chilies'),
  ('guajillo chilies')
ON CONFLICT (ingredient_name) DO NOTHING;

-- Verify
SELECT * FROM two_word_ingredients WHERE ingredient_name LIKE '%ancho%' OR ingredient_name LIKE '%guajillo%';

