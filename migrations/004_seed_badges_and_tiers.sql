-- =====================================================
-- Migration: Seed Badges and Badge Tiers
-- =====================================================
-- Populates the badge catalog with initial badges and their tier thresholds

-- Insert badges (idempotent)
INSERT INTO public.badges (badge_code, display_name, description, icon, family) VALUES
  ('recipe_maker', 'Recipe Maker', 'Add recipes to your cookbook', 'chef-hat', 'cooking'),
  ('cuisine_explorer', 'Cuisine Explorer', 'Cook recipes from different cuisines', 'globe', 'cooking'),
  ('curator', 'Curator', 'Collect recipes in your cookbook', 'book-marked', 'collecting'),
  ('top_rated_chef', 'Top Rated Chef', 'Maintain highly rated recipes (avg ≥4.5★)', 'crown', 'quality'),
  ('recipe_judge', 'Recipe Judge', 'Leave thoughtful reviews', 'star', 'community'),
  ('originals_only', 'Original Creator', 'Add original (non-imported) recipes', 'sparkles', 'creativity'),
  ('crowd_favorite', 'Crowd Favorite', 'Have your recipes added by other users', 'heart', 'community'),
  ('monthly_meal_master', 'Monthly Meal Master', 'Plan meals on your calendar', 'calendar', 'planning'),
  ('regional_specialist', 'Regional Specialist', 'Master recipes from a single cuisine', 'flame', 'expertise'),
  ('ingredient_adventurer', 'Ingredient Adventurer', 'Cook with diverse ingredients', 'list', 'exploration'),
  ('list_legend', 'List Legend', 'Generate shopping lists', 'shopping-cart', 'planning'),
  ('alexa_ally', 'Alexa Ally', 'Push recipes to Alexa', 'mic', 'technology'),
  ('bug_bounty', 'Bug Hunter', 'Report confirmed bugs', 'bug', 'community'),
  ('chef_tony_apprentice', 'Chef Tony Apprentice', 'Ask meaningful AI questions', 'brain', 'ai'),
  ('conversion_wizard', 'Conversion Wizard', 'Use unit conversions', 'calculator', 'tools'),
  ('holiday_baker', 'Holiday Baker', 'Bake holiday desserts in December', 'cake', 'seasonal')
ON CONFLICT (badge_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  family = EXCLUDED.family;

-- Insert badge tiers (idempotent)
INSERT INTO public.badge_tiers (badge_code, tier, label, threshold) VALUES
  -- Recipe Maker: 25/50/100/250
  ('recipe_maker', 1, 'Bronze', 25),
  ('recipe_maker', 2, 'Silver', 50),
  ('recipe_maker', 3, 'Gold', 100),
  ('recipe_maker', 4, 'Platinum', 250),
  
  -- Cuisine Explorer: 3/5/7/10 cuisines
  ('cuisine_explorer', 1, 'Bronze', 3),
  ('cuisine_explorer', 2, 'Silver', 5),
  ('cuisine_explorer', 3, 'Gold', 7),
  ('cuisine_explorer', 4, 'Platinum', 10),
  
  -- Curator: 5/10/25/50/100
  ('curator', 1, 'Bronze', 5),
  ('curator', 2, 'Silver', 10),
  ('curator', 3, 'Gold', 25),
  ('curator', 4, 'Platinum', 50),
  ('curator', 5, 'Diamond', 100),
  
  -- Top Rated Chef: 3/10/25 recipes with avg ≥4.5★
  ('top_rated_chef', 1, 'Bronze', 3),
  ('top_rated_chef', 2, 'Silver', 10),
  ('top_rated_chef', 3, 'Gold', 25),
  
  -- Recipe Judge: 10/30/100 thoughtful reviews (≥20 chars)
  ('recipe_judge', 1, 'Bronze', 10),
  ('recipe_judge', 2, 'Silver', 30),
  ('recipe_judge', 3, 'Gold', 100),
  
  -- Originals Only: 5/20/50 non-imported recipes
  ('originals_only', 1, 'Bronze', 5),
  ('originals_only', 2, 'Silver', 20),
  ('originals_only', 3, 'Gold', 50),
  
  -- Crowd Favorite: 25/100/500 times added by others
  ('crowd_favorite', 1, 'Bronze', 25),
  ('crowd_favorite', 2, 'Silver', 100),
  ('crowd_favorite', 3, 'Gold', 500),
  
  -- Monthly Meal Master: 5/10/15 calendar adds in a month
  ('monthly_meal_master', 1, 'Bronze', 5),
  ('monthly_meal_master', 2, 'Silver', 10),
  ('monthly_meal_master', 3, 'Gold', 15),
  
  -- Regional Specialist: 10/25/50 recipes in one cuisine
  ('regional_specialist', 1, 'Bronze', 10),
  ('regional_specialist', 2, 'Silver', 25),
  ('regional_specialist', 3, 'Gold', 50),
  
  -- Ingredient Adventurer: 50/100/200 distinct ingredients
  ('ingredient_adventurer', 1, 'Bronze', 50),
  ('ingredient_adventurer', 2, 'Silver', 100),
  ('ingredient_adventurer', 3, 'Gold', 200),
  
  -- List Legend: 5/20/50 shopping lists
  ('list_legend', 1, 'Bronze', 5),
  ('list_legend', 2, 'Silver', 20),
  ('list_legend', 3, 'Gold', 50),
  
  -- Alexa Ally: 3/10/25 Alexa pushes
  ('alexa_ally', 1, 'Bronze', 3),
  ('alexa_ally', 2, 'Silver', 10),
  ('alexa_ally', 3, 'Gold', 25),
  
  -- Bug Bounty: 1/3/10 confirmed bugs
  ('bug_bounty', 1, 'Bronze', 1),
  ('bug_bounty', 2, 'Silver', 3),
  ('bug_bounty', 3, 'Gold', 10),
  
  -- Chef Tony Apprentice: 10/30/100 meaningful AI queries
  ('chef_tony_apprentice', 1, 'Bronze', 10),
  ('chef_tony_apprentice', 2, 'Silver', 30),
  ('chef_tony_apprentice', 3, 'Gold', 100),
  
  -- Conversion Wizard: 10/30/100 unit conversions
  ('conversion_wizard', 1, 'Bronze', 10),
  ('conversion_wizard', 2, 'Silver', 30),
  ('conversion_wizard', 3, 'Gold', 100),
  
  -- Holiday Baker: 3 holiday desserts (single tier)
  ('holiday_baker', 1, 'Gold', 3)
ON CONFLICT (badge_code, tier) DO UPDATE SET
  label = EXCLUDED.label,
  threshold = EXCLUDED.threshold;

-- Add helpful comment
COMMENT ON TABLE public.badge_tiers IS 'Progressive thresholds: Bronze (beginner), Silver (intermediate), Gold (advanced), Platinum/Diamond (expert)';


