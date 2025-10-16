-- Comprehensive policy conflict resolution
-- This script drops ALL possible policy variations that might exist

-- ========================================
-- PROFILES TABLE POLICIES
-- ========================================

-- Drop all possible profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Moderators can manage all profiles" ON public.profiles;

-- ========================================
-- USER RECIPES POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can insert own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can update own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can delete own user recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can manage own user recipes" ON public.user_recipes;

DROP POLICY IF EXISTS "Users can manage own user recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can view own user recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert own user recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can update own user recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete own user recipe ingredients" ON public.user_recipe_ingredients;

DROP POLICY IF EXISTS "Users can manage own user recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can view own user recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can insert own user recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can update own user recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can delete own user recipe steps" ON public.user_recipe_steps;

DROP POLICY IF EXISTS "Users can manage own user recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can view own user recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can insert own user recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can update own user recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can delete own user recipe equipment" ON public.user_recipe_equipment;

DROP POLICY IF EXISTS "Users can manage own user recipe tags" ON public.user_recipe_tags;
DROP POLICY IF EXISTS "Users can view own user recipe tags" ON public.user_recipe_tags;
DROP POLICY IF EXISTS "Users can insert own user recipe tags" ON public.user_recipe_tags;
DROP POLICY IF EXISTS "Users can update own user recipe tags" ON public.user_recipe_tags;
DROP POLICY IF EXISTS "Users can delete own user recipe tags" ON public.user_recipe_tags;

-- ========================================
-- GLOBAL RECIPES POLICIES
-- ========================================

DROP POLICY IF EXISTS "Anyone can view published global recipes" ON public.global_recipes;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipes" ON public.global_recipes;
DROP POLICY IF EXISTS "Admins can manage global recipes" ON public.global_recipes;
DROP POLICY IF EXISTS "Moderators can manage global recipes" ON public.global_recipes;
DROP POLICY IF EXISTS "Users can view published global recipes" ON public.global_recipes;

DROP POLICY IF EXISTS "Anyone can view published global recipe ingredients" ON public.global_recipe_ingredients;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe ingredients" ON public.global_recipe_ingredients;
DROP POLICY IF EXISTS "Admins can manage global recipe ingredients" ON public.global_recipe_ingredients;
DROP POLICY IF EXISTS "Moderators can manage global recipe ingredients" ON public.global_recipe_ingredients;

DROP POLICY IF EXISTS "Anyone can view published global recipe steps" ON public.global_recipe_steps;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe steps" ON public.global_recipe_steps;
DROP POLICY IF EXISTS "Admins can manage global recipe steps" ON public.global_recipe_steps;
DROP POLICY IF EXISTS "Moderators can manage global recipe steps" ON public.global_recipe_steps;

DROP POLICY IF EXISTS "Anyone can view published global recipe equipment" ON public.global_recipe_equipment;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe equipment" ON public.global_recipe_equipment;
DROP POLICY IF EXISTS "Admins can manage global recipe equipment" ON public.global_recipe_equipment;
DROP POLICY IF EXISTS "Moderators can manage global recipe equipment" ON public.global_recipe_equipment;

DROP POLICY IF EXISTS "Anyone can view published global recipe tags" ON public.global_recipe_tags;
DROP POLICY IF EXISTS "Admins and moderators can manage global recipe tags" ON public.global_recipe_tags;
DROP POLICY IF EXISTS "Admins can manage global recipe tags" ON public.global_recipe_tags;
DROP POLICY IF EXISTS "Moderators can manage global recipe tags" ON public.global_recipe_tags;

-- ========================================
-- GLOBAL CANDIDATES POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Users can insert own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Users can update own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Users can delete own global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can view all global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can update global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Moderators can manage global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Admins can view all global candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Admins can manage global candidates" ON public.global_candidates;

-- ========================================
-- RATINGS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.ratings;

-- ========================================
-- MEAL PLAN POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plan;
DROP POLICY IF EXISTS "Users can manage own meal plans" ON public.meal_plan;

-- ========================================
-- SHOPPING LISTS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Users can view own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can insert own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can update own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can delete own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users can manage own shopping lists" ON public.shopping_lists;

-- ========================================
-- FUNCTIONS
-- ========================================

DROP FUNCTION IF EXISTS get_random_ouioui_line(text, text);
DROP FUNCTION IF EXISTS get_random_ouioui_line(text);
DROP FUNCTION IF EXISTS get_random_ouioui_line();

-- ========================================
-- INDEXES
-- ========================================

DROP INDEX IF EXISTS idx_profiles_pantry_ingredients;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'All policies, functions, and indexes dropped successfully! Schema should run without conflicts now.' as status;
