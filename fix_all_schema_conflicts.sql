-- Fix ALL schema conflicts (functions and policies)
-- Run this in your Supabase SQL editor before running the main schema

-- ========================================
-- PART 1: Fix function conflicts
-- ========================================

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_random_ouioui_line(text, text);

-- Also try dropping with different parameter types that might exist
DROP FUNCTION IF EXISTS get_random_ouioui_line(text);
DROP FUNCTION IF EXISTS get_random_ouioui_line();

-- ========================================
-- PART 2: Fix policy conflicts
-- ========================================

-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Drop other potentially conflicting policies
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Drop policies for user recipes
DROP POLICY IF EXISTS "Users can view own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can insert own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can update own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can delete own user recipes" ON public.user_recipes;

DROP POLICY IF EXISTS "Users can manage own user recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can manage own user recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can manage own user recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can manage own user recipe tags" ON public.user_recipe_tags;

-- Drop policies for global recipes
DROP POLICY IF EXISTS "Anyone can view published global recipes" ON public.global_recipes;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipes" ON public.global_recipes;
DROP POLICY IF EXISTS "Anyone can view published global recipe ingredients" ON public.global_recipe_ingredients;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe ingredients" ON public.global_recipe_ingredients;
DROP POLICY IF EXISTS "Anyone can view published global recipe steps" ON public.global_recipe_steps;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe steps" ON public.global_recipe_steps;
DROP POLICY IF EXISTS "Anyone can view published global recipe equipment" ON public.global_recipe_equipment;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe equipment" ON public.global_recipe_equipment;
DROP POLICY IF EXISTS "Anyone can view published global recipe tags" ON public.global_recipe_tags;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe tags" ON public.global_recipe_tags;

-- Drop policies for global candidates
DROP POLICY IF EXISTS "Users can view own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Users can insert own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can view all global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can update global candidates" ON public.global_candidates;

-- Drop policies for ratings
DROP POLICY IF EXISTS "Users can view own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.ratings;

-- Drop policies for meal plans
DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plan;

-- Drop policies for shopping lists
DROP POLICY IF EXISTS "Users can view own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can insert own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can update own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON public.shopping_lists;

-- ========================================
-- PART 3: Drop any other potentially conflicting objects
-- ========================================

-- Drop indexes that might conflict
DROP INDEX IF EXISTS idx_profiles_pantry_ingredients;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'All conflicts resolved successfully! You can now run the supabase-schema.sql file without errors.' as status;
