-- Check your current profile to see what values to match
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

-- Also check what valid values are allowed for each field
SELECT 
  'Valid diet_type values:' as info,
  unnest(ARRAY['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'halal', 'kosher', 'other']) as valid_values
UNION ALL
SELECT 
  'Valid skill_level values:' as info,
  unnest(ARRAY['beginner', 'home_cook', 'advanced', 'professional']) as valid_values;
