-- Setup test users for Discovery feature
-- This script will create test users that match your profile

-- Step 1: Check your current profile
SELECT 
  'Your Profile:' as info,
  user_id,
  display_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility
FROM profiles 
WHERE user_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64';

-- Step 2: Create test users with similar preferences
-- (Run this after checking your profile above)

-- Test User 1: Perfect match
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111', 'TestChef1', 'Test Chef One',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7749, -122.4194, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 2: Perfect match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222', 'TestChef2', 'Test Chef Two',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7750, -122.4195, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 3: Perfect match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333', 'TestChef3', 'Test Chef Three',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7748, -122.4193, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 4: 2/3 match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444', 'TestChef4', 'Test Chef Four',
  'vegetarian', 'beginner', 'italian',
  true, 37.7751, -122.4196, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 5: 2/3 match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555', 'TestChef5', 'Test Chef Five',
  'vegetarian', 'home_cook', 'mexican',
  true, 37.7747, -122.4192, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 6: Perfect match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '66666666-6666-6666-6666-666666666666', 'TestChef6', 'Test Chef Six',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7752, -122.4197, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 7: Perfect match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '77777777-7777-7777-7777-777777777777', 'TestChef7', 'Test Chef Seven',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7746, -122.4191, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 8: 2/3 match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '88888888-8888-8888-8888-888888888888', 'TestChef8', 'Test Chef Eight',
  'vegan', 'home_cook', 'italian',
  true, 37.7753, -122.4198, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 9: Perfect match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  '99999999-9999-9999-9999-999999999999', 'TestChef9', 'Test Chef Nine',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7745, -122.4190, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Test User 10: Perfect match + nearby
INSERT INTO profiles (
  user_id, display_name, full_name, diet_type, skill_level, favorite_cuisine,
  geo_opt_in, lat, lng, visibility, created_at, updated_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TestChef10', 'Test Chef Ten',
  'vegetarian', 'home_cook', 'italian',
  true, 37.7754, -122.4199, 'ANYONE', now(), now()
) ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Create some friendship relationships
INSERT INTO user_friends (user_id, friend_id, created_at) VALUES
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '11111111-1111-1111-1111-111111111111', now()),
('11111111-1111-1111-1111-111111111111', '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', now()),
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '66666666-6666-6666-6666-666666666666', now()),
('66666666-6666-6666-6666-666666666666', '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', now())
ON CONFLICT DO NOTHING;

-- Step 4: Create some follow relationships
INSERT INTO user_follows (follower_id, followee_id, created_at) VALUES
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '22222222-2222-2222-2222-222222222222', now()),
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '33333333-3333-3333-3333-333333333333', now()),
('77777777-7777-7777-7777-777777777777', '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', now())
ON CONFLICT DO NOTHING;

-- Step 5: Verify the setup
SELECT 
  'Test Users Created:' as status,
  count(*) as user_count
FROM profiles 
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Show the test users
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
FROM profiles 
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
ORDER BY display_name;
