-- Fix function conflict for get_random_ouioui_line
-- Run this in your Supabase SQL editor before running the main schema

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_random_ouioui_line(text, text);

-- Also try dropping with different parameter types that might exist
DROP FUNCTION IF EXISTS get_random_ouioui_line(text);
DROP FUNCTION IF EXISTS get_random_ouioui_line();

-- Now you can safely run the supabase-schema.sql file
-- The function will be recreated with the correct return type

SELECT 'Function dropped successfully. You can now run the main schema file.' as status;
