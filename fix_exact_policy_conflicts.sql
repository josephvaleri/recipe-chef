-- Fix exact policy conflicts - matches the exact policy names from supabase-schema.sql
-- Run this in your Supabase SQL editor before running the main schema

-- ========================================
-- PROFILES POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- ========================================
-- USER RECIPES POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can view own recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.user_recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.user_recipes;

-- ========================================
-- USER RECIPE COMPONENTS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can manage own recipe ingredients" ON public.user_recipe_ingredients;
DROP POLICY IF EXISTS "Users can manage own recipe steps" ON public.user_recipe_steps;
DROP POLICY IF EXISTS "Users can manage own recipe equipment" ON public.user_recipe_equipment;
DROP POLICY IF EXISTS "Users can manage own recipe tags" ON public.user_recipe_tags;

-- ========================================
-- GLOBAL RECIPES POLICIES
-- ========================================
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

-- ========================================
-- GLOBAL CANDIDATES POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can view own candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Users can insert candidates" ON public.global_candidates;
DROP POLICY IF EXISTS "Admins and moderators can manage all candidates" ON public.global_candidates;

-- ========================================
-- RATINGS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.ratings;

-- ========================================
-- MEAL PLAN POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can manage own meal plan" ON public.meal_plan;

-- ========================================
-- SHOPPING LISTS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can manage own shopping lists" ON public.shopping_lists;

-- ========================================
-- AI FEEDBACK POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can manage own AI feedback" ON public.ai_feedback;

-- ========================================
-- IMPORT LOGS POLICIES
-- ========================================
DROP POLICY IF EXISTS "Users can view own import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Users can insert own import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Admins can view all import logs" ON public.import_logs;

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
SELECT 'All exact policy conflicts resolved! Schema should run without errors now.' as status;
