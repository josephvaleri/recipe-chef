-- Test discovery functions that work with test data
-- These functions can be used to test the discovery logic without requiring auth users

-- Create a test version of the people-like-you function
CREATE OR REPLACE FUNCTION public.test_discover_people_like_you(
  p_user_id uuid,
  p_limit int default 20
)
RETURNS table (
  user_id uuid,
  display_name text,
  score numeric
) language sql stable as $$
  with me as (
    select diet_type, skill_level, favorite_cuisine
    from public.profiles
    where user_id = p_user_id
  )
  select p.user_id,
         coalesce(p.display_name, p.full_name, 'Anonymous') as display_name,
         (
           (case when p.diet_type        = (select diet_type        from me) then 1 else 0 end) +
           (case when p.skill_level      = (select skill_level      from me) then 1 else 0 end) +
           (case when p.favorite_cuisine = (select favorite_cuisine from me) then 1 else 0 end)
         )::numeric as score
  from public.profiles p
  where p.user_id <> p_user_id
    and p.diet_type is not null
    and p.skill_level is not null  
    and p.favorite_cuisine is not null
  order by score desc nulls last, display_name asc
  limit p_limit;
$$;

-- Create a test version of the near-me function
CREATE OR REPLACE FUNCTION public.test_discover_near_me(
  p_user_id uuid,
  p_radius_km numeric default 50
)
RETURNS table (
  user_id uuid,
  display_name text,
  distance_km numeric
) language sql stable as $$
  with me as (
    select lat as mlat, lng as mlng
    from public.profiles
    where user_id = p_user_id and geo_opt_in = true
  )
  select p.user_id,
         coalesce(p.display_name, p.full_name, 'Anonymous') as display_name,
         (111.045 * acos(least(1.0,
           cos(radians((select mlat from me))) * cos(radians(p.lat)) *
           cos(radians(p.lng) - radians((select mlng from me))) +
           sin(radians((select mlat from me))) * sin(radians(p.lat))
         ))) as distance_km
  from public.profiles p
  where p.user_id <> p_user_id
    and p.geo_opt_in = true
    and (select mlat from me) is not null
    and (111.045 * acos(least(1.0,
           cos(radians((select mlat from me))) * cos(radians(p.lat)) *
           cos(radians(p.lng) - radians((select mlng from me))) +
           sin(radians((select mlat from me))) * sin(radians(p.lat))
         ))) <= p_radius_km
  order by distance_km asc;
$$;

-- Create a test version of the search function
CREATE OR REPLACE FUNCTION public.test_search_profiles(
  p_q text,
  p_limit int default 20
)
RETURNS table (
  user_id uuid,
  display_name text
) language sql stable as $$
  select p.user_id,
         coalesce(p.display_name, p.full_name, 'Anonymous') as display_name
  from public.profiles p
  where (
      p.display_name ilike '%' || p_q || '%'
      or p.full_name  ilike '%' || p_q || '%'
    )
  order by display_name asc
  limit p_limit;
$$;

-- Test the functions with your user ID
SELECT 'Testing People Like You function:' as test_type;
SELECT * FROM public.test_discover_people_like_you('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', 10);

SELECT 'Testing Near Me function:' as test_type;
SELECT * FROM public.test_discover_near_me('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64', 50);

SELECT 'Testing Search function:' as test_type;
SELECT * FROM public.test_search_profiles('test', 10);

-- Show your current profile for reference
SELECT 'Your current profile:' as info;
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
