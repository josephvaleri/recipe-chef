-- Performance optimization indexes for Recipe Chef
-- These indexes address the critical performance issues identified in the cookbook page

-- Index for user_recipes table - optimizes the main cookbook query
-- This composite index covers the WHERE clause (user_id) and ORDER BY clause (created_at)
CREATE INDEX IF NOT EXISTS idx_user_recipes_user_created 
  ON public.user_recipes(user_id, created_at DESC);

-- Index for ratings table - optimizes the rating lookup queries
-- This composite index covers the WHERE clause for rating lookups
CREATE INDEX IF NOT EXISTS idx_ratings_user_scope_key 
  ON public.ratings(user_id, recipe_scope, recipe_key);

-- Index for user_recipe_ingredients - optimizes ingredient loading
-- This index helps with JOINs when loading recipe ingredients
CREATE INDEX IF NOT EXISTS idx_user_recipe_ingredients_recipe_id 
  ON public.user_recipe_ingredients(user_recipe_id);

-- Index for cuisines table - optimizes cuisine name lookups
CREATE INDEX IF NOT EXISTS idx_cuisines_name 
  ON public.cuisines(name);

-- Index for meal_types table - optimizes meal type name lookups  
CREATE INDEX IF NOT EXISTS idx_meal_types_name 
  ON public.meal_types(name);

-- Index for ingredients table - optimizes ingredient name lookups
CREATE INDEX IF NOT EXISTS idx_ingredients_name 
  ON public.ingredients(name);

-- Index for ingredients table - optimizes category-based queries
CREATE INDEX IF NOT EXISTS idx_ingredients_category_id 
  ON public.ingredients(category_id);

-- Performance note: These indexes will significantly improve query performance
-- especially for users with large recipe collections (100+ recipes)
-- The main cookbook query should now execute in milliseconds instead of seconds
