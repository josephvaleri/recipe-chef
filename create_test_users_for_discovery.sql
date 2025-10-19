-- Create test users for Discovery feature testing
-- These users will match user 4b9ba105-1d9e-4f3a-b603-760b3f4ffe64

-- First, let's check the current user's profile to match their preferences
-- (You'll need to run this first to see what to match)
SELECT 
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility
FROM profiles 
WHERE user_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64';

-- Create 10 test users with similar preferences
-- Note: These are fake UUIDs for testing - in production you'd use real auth users

-- Test User 1: Similar diet, skill, cuisine + nearby location
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'TestChef1',
  'Test Chef One',
  'vegetarian', -- Match your diet
  'home_cook', -- Match your skill
  'italian', -- Match your cuisine
  true,
  37.7749 + (random() - 0.5) * 0.01, -- San Francisco area + small random offset
  -122.4194 + (random() - 0.5) * 0.01,
  'ANYONE',
  now(),
  now()
);

-- Test User 2: Similar preferences + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'TestChef2',
  'Test Chef Two',
  'vegetarian',
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.02,
  -122.4194 + (random() - 0.5) * 0.02,
  'FRIENDS_AND_FOLLOWERS',
  now(),
  now()
);

-- Test User 3: Similar preferences + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'TestChef3',
  'Test Chef Three',
  'vegetarian',
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.015,
  -122.4194 + (random() - 0.5) * 0.015,
  'ANYONE',
  now(),
  now()
);

-- Test User 4: Partial match (2 out of 3 preferences) + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'TestChef4',
  'Test Chef Four',
  'vegetarian',
  'beginner', -- Different skill level
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.012,
  -122.4194 + (random() - 0.5) * 0.012,
  'ANYONE',
  now(),
  now()
);

-- Test User 5: Partial match + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'TestChef5',
  'Test Chef Five',
  'vegetarian',
  'home_cook',
  'mexican', -- Different cuisine
  true,
  37.7749 + (random() - 0.5) * 0.008,
  -122.4194 + (random() - 0.5) * 0.008,
  'FRIENDS_ONLY',
  now(),
  now()
);

-- Test User 6: Perfect match + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  'TestChef6',
  'Test Chef Six',
  'vegetarian',
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.005,
  -122.4194 + (random() - 0.5) * 0.005,
  'ANYONE',
  now(),
  now()
);

-- Test User 7: Similar preferences + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  'TestChef7',
  'Test Chef Seven',
  'vegetarian',
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.018,
  -122.4194 + (random() - 0.5) * 0.018,
  'ANYONE',
  now(),
  now()
);

-- Test User 8: Partial match + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  'TestChef8',
  'Test Chef Eight',
  'vegan', -- Different diet
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.025,
  -122.4194 + (random() - 0.5) * 0.025,
  'FRIENDS_AND_FOLLOWERS',
  now(),
  now()
);

-- Test User 9: Perfect match + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'TestChef9',
  'Test Chef Nine',
  'vegetarian',
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.003,
  -122.4194 + (random() - 0.5) * 0.003,
  'ANYONE',
  now(),
  now()
);

-- Test User 10: Similar preferences + nearby
INSERT INTO profiles (
  user_id,
  display_name,
  full_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  lat,
  lng,
  visibility,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'TestChef10',
  'Test Chef Ten',
  'vegetarian',
  'home_cook',
  'italian',
  true,
  37.7749 + (random() - 0.5) * 0.02,
  -122.4194 + (random() - 0.5) * 0.02,
  'ANYONE',
  now(),
  now()
);

-- Create some friendship relationships for testing
-- Make a few of these users friends with your test user
INSERT INTO user_friends (user_id, friend_id, created_at) VALUES
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '11111111-1111-1111-1111-111111111111', now()),
('11111111-1111-1111-1111-111111111111', '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', now()),
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '66666666-6666-6666-6666-666666666666', now()),
('66666666-6666-6666-6666-666666666666', '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', now());

-- Create some follow relationships
INSERT INTO user_follows (follower_id, followee_id, created_at) VALUES
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '22222222-2222-2222-2222-222222222222', now()),
('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', '33333333-3333-3333-3333-333333333333', now()),
('77777777-7777-7777-7777-777777777777', '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', now());

-- Verify the test data
SELECT 
  'Test Users Created' as status,
  count(*) as user_count
FROM profiles 
WHERE user_id LIKE '%-1111-1111-1111-111111111111'
   OR user_id LIKE '%-2222-2222-2222-222222222222'
   OR user_id LIKE '%-3333-3333-3333-333333333333'
   OR user_id LIKE '%-4444-4444-4444-444444444444'
   OR user_id LIKE '%-5555-5555-5555-555555555555'
   OR user_id LIKE '%-6666-6666-6666-666666666666'
   OR user_id LIKE '%-7777-7777-7777-777777777777'
   OR user_id LIKE '%-8888-8888-8888-888888888888'
   OR user_id LIKE '%-9999-9999-9999-999999999999'
   OR user_id LIKE '%-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Show sample of created users
SELECT 
  user_id,
  display_name,
  diet_type,
  skill_level,
  favorite_cuisine,
  geo_opt_in,
  visibility
FROM profiles 
WHERE user_id LIKE '%-1111-1111-1111-111111111111'
   OR user_id LIKE '%-2222-2222-2222-222222222222'
   OR user_id LIKE '%-3333-3333-3333-333333333333'
   OR user_id LIKE '%-4444-4444-4444-444444444444'
   OR user_id LIKE '%-5555-5555-5555-555555555555'
ORDER BY created_at DESC
LIMIT 5;
