-- Safe test user setup for Discovery feature
-- This approach works with existing users or creates test data differently

-- Option 1: Check if there are existing users we can use for testing
SELECT 
  'Existing users that could be used for testing:' as info,
  count(*) as user_count
FROM profiles 
WHERE user_id != '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'
  AND (diet_type IS NOT NULL OR skill_level IS NOT NULL OR favorite_cuisine IS NOT NULL);

-- Show existing users with their preferences
SELECT 
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  visibility
FROM profiles 
WHERE user_id != '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'
  AND (diet_type IS NOT NULL OR skill_level IS NOT NULL OR favorite_cuisine IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;

-- Option 2: Update existing users to have matching preferences
-- (Only run this if you have other users in your system)

-- Example: Update a few existing users to match your preferences
-- Replace the user_ids below with actual existing user IDs from your system

/*
-- Update existing user 1 to match your preferences
UPDATE profiles 
SET 
  diet_type = 'vegetarian',
  skill_level = 'home_cook', 
  favorite_cuisine = 'italian',
  geo_opt_in = true,
  lat = 37.7750,
  lng = -122.4195,
  visibility = 'ANYONE',
  updated_at = now()
WHERE user_id = 'REPLACE_WITH_ACTUAL_USER_ID_1';

-- Update existing user 2 to match your preferences  
UPDATE profiles 
SET 
  diet_type = 'vegetarian',
  skill_level = 'home_cook',
  favorite_cuisine = 'italian', 
  geo_opt_in = true,
  lat = 37.7748,
  lng = -122.4193,
  visibility = 'ANYONE',
  updated_at = now()
WHERE user_id = 'REPLACE_WITH_ACTUAL_USER_ID_2';

-- Update existing user 3 to have partial match
UPDATE profiles 
SET 
  diet_type = 'vegetarian',
  skill_level = 'beginner',
  favorite_cuisine = 'italian',
  geo_opt_in = true, 
  lat = 37.7751,
  lng = -122.4196,
  visibility = 'ANYONE',
  updated_at = now()
WHERE user_id = 'REPLACE_WITH_ACTUAL_USER_ID_3';
*/

-- Option 3: Create test data by temporarily disabling constraints (NOT RECOMMENDED for production)
-- This is only for development/testing purposes

-- First, let's see what constraints exist
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
  AND conname LIKE '%user_id%';

-- Option 4: Alternative approach - Create a test data table
-- This doesn't require auth users

-- Create a temporary test profiles table for testing
CREATE TABLE IF NOT EXISTS test_profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  full_name text,
  diet_type text,
  skill_level text,
  favorite_cuisine text,
  geo_opt_in boolean,
  lat double precision,
  lng double precision,
  visibility text,
  created_at timestamptz DEFAULT now()
);

-- Insert test data into the test table
INSERT INTO test_profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility
) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'TestChef1', 'Test Chef One', 'vegetarian', 'home_cook', 'italian', true, 37.7749, -122.4194, 'ANYONE'),
  ('22222222-2222-2222-2222-222222222222', 'TestChef2', 'Test Chef Two', 'vegetarian', 'home_cook', 'italian', true, 37.7750, -122.4195, 'ANYONE'),
  ('33333333-3333-3333-3333-333333333333', 'TestChef3', 'Test Chef Three', 'vegetarian', 'home_cook', 'italian', true, 37.7748, -122.4193, 'ANYONE'),
  ('44444444-4444-4444-4444-444444444444', 'TestChef4', 'Test Chef Four', 'vegetarian', 'beginner', 'italian', true, 37.7751, -122.4196, 'ANYONE'),
  ('55555555-5555-5555-5555-555555555555', 'TestChef5', 'Test Chef Five', 'vegetarian', 'home_cook', 'mexican', true, 37.7747, -122.4192, 'ANYONE'),
  ('66666666-6666-6666-6666-666666666666', 'TestChef6', 'Test Chef Six', 'vegetarian', 'home_cook', 'italian', true, 37.7752, -122.4197, 'ANYONE'),
  ('77777777-7777-7777-7777-777777777777', 'TestChef7', 'Test Chef Seven', 'vegetarian', 'home_cook', 'italian', true, 37.7746, -122.4191, 'ANYONE'),
  ('88888888-8888-8888-8888-888888888888', 'TestChef8', 'Test Chef Eight', 'vegan', 'home_cook', 'italian', true, 37.7753, -122.4198, 'ANYONE'),
  ('99999999-9999-9999-9999-999999999999', 'TestChef9', 'Test Chef Nine', 'vegetarian', 'home_cook', 'italian', true, 37.7745, -122.4190, 'ANYONE'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TestChef10', 'Test Chef Ten', 'vegetarian', 'home_cook', 'italian', true, 37.7754, -122.4199, 'ANYONE')
ON CONFLICT (user_id) DO NOTHING;

-- Verify test data was created
SELECT 
  'Test profiles created:' as status,
  count(*) as user_count
FROM test_profiles;

-- Show the test data
SELECT 
  user_id,
  display_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility
FROM test_profiles
ORDER BY display_name;
