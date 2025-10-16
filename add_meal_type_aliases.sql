-- Create meal type aliases table

CREATE TABLE IF NOT EXISTS public.meal_type_aliases (
  alias_id SERIAL PRIMARY KEY,
  meal_type_id INT NOT NULL REFERENCES public.meal_types(meal_type_id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE(alias)
);

-- Add common aliases for meal types
DO $$
DECLARE
  appetizer_id INT;
  entree_id INT;
  side_dish_id INT;
  dessert_id INT;
  soup_id INT;
  salad_id INT;
  breakfast_id INT;
  lunch_id INT;
  dinner_id INT;
  snack_id INT;
  beverage_id INT;
BEGIN
  -- Get meal type IDs
  SELECT meal_type_id INTO appetizer_id FROM meal_types WHERE LOWER(name) = 'appetizer';
  SELECT meal_type_id INTO entree_id FROM meal_types WHERE LOWER(name) = 'entrée' OR LOWER(name) = 'entree';
  SELECT meal_type_id INTO side_dish_id FROM meal_types WHERE LOWER(name) = 'side dish';
  SELECT meal_type_id INTO dessert_id FROM meal_types WHERE LOWER(name) = 'dessert';
  SELECT meal_type_id INTO soup_id FROM meal_types WHERE LOWER(name) = 'soup';
  SELECT meal_type_id INTO salad_id FROM meal_types WHERE LOWER(name) = 'salad';
  SELECT meal_type_id INTO breakfast_id FROM meal_types WHERE LOWER(name) = 'breakfast';
  SELECT meal_type_id INTO lunch_id FROM meal_types WHERE LOWER(name) = 'lunch';
  SELECT meal_type_id INTO dinner_id FROM meal_types WHERE LOWER(name) = 'dinner';
  SELECT meal_type_id INTO snack_id FROM meal_types WHERE LOWER(name) = 'snack';
  SELECT meal_type_id INTO beverage_id FROM meal_types WHERE LOWER(name) = 'beverage';

  -- Add aliases for Appetizer
  IF appetizer_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (appetizer_id, 'starter'),
      (appetizer_id, 'starters'),
      (appetizer_id, 'appetizers'),
      (appetizer_id, 'hors d''oeuvre'),
      (appetizer_id, 'finger food')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Entrée
  IF entree_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (entree_id, 'main course'),
      (entree_id, 'main dish'),
      (entree_id, 'main'),
      (entree_id, 'entree'),
      (entree_id, 'entrée'),
      (entree_id, 'main courses'),
      (entree_id, 'dinner main')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Side Dish
  IF side_dish_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (side_dish_id, 'side'),
      (side_dish_id, 'sides'),
      (side_dish_id, 'accompaniment'),
      (side_dish_id, 'side dishes')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Dessert
  IF dessert_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (dessert_id, 'desserts'),
      (dessert_id, 'sweet'),
      (dessert_id, 'sweets'),
      (dessert_id, 'pastry'),
      (dessert_id, 'baked goods')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Soup
  IF soup_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (soup_id, 'soups'),
      (soup_id, 'stew'),
      (soup_id, 'stews'),
      (soup_id, 'chowder'),
      (soup_id, 'bisque')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Salad
  IF salad_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (salad_id, 'salads'),
      (salad_id, 'greens')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Breakfast
  IF breakfast_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (breakfast_id, 'brunch'),
      (breakfast_id, 'morning meal')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Beverage
  IF beverage_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (beverage_id, 'drink'),
      (beverage_id, 'drinks'),
      (beverage_id, 'beverages'),
      (beverage_id, 'cocktail'),
      (beverage_id, 'cocktails'),
      (beverage_id, 'smoothie')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  -- Add aliases for Snack
  IF snack_id IS NOT NULL THEN
    INSERT INTO meal_type_aliases (meal_type_id, alias) VALUES
      (snack_id, 'snacks'),
      (snack_id, 'appetizer')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

END $$;

-- Verify additions
SELECT 'Meal Type Aliases Created:' as info;
SELECT 
  mt.name as meal_type, 
  mta.alias
FROM meal_type_aliases mta
JOIN meal_types mt ON mta.meal_type_id = mt.meal_type_id
ORDER BY mt.name, mta.alias;



