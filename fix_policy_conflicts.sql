-- Fix policy conflicts for profiles table
-- Run this in your Supabase SQL editor before running the main schema

-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Drop other potentially conflicting policies
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Also drop policies for other tables that might conflict
DROP POLICY IF EXISTS "Users can view own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can insert own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can update own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can delete own user recipes" ON public.user_recipes;

DROP POLICY IF EXISTS "Users can manage own user recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can manage own user recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can manage own user recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can manage own user recipe tags" ON public.user_recipe_tags;

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

DROP POLICY IF EXISTS "Users can view own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Users can insert own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can view all global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can update global candidates" ON public.global_candidates;

DROP POLICY IF EXISTS "Users can view own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.ratings;

DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plan;

DROP POLICY IF EXISTS "Users can view own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can insert own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can update own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON public.shopping_lists;

SELECT 'All conflicting policies dropped successfully. You can now run the main schema file.' as status;
