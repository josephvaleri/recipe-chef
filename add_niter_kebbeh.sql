-- Add niter kebbeh variations to two_word_ingredients
INSERT INTO two_word_ingredients (ingredient_name)
VALUES 
  ('niter kebbeh'),
  ('niter kibbeh'),
  ('spiced butter')
ON CONFLICT (ingredient_name) DO NOTHING;

-- Verify
SELECT * FROM two_word_ingredients WHERE ingredient_name LIKE '%niter%' OR ingredient_name LIKE '%kebbeh%' OR ingredient_name LIKE '%butter%';

