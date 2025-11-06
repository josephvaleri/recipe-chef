-- Test to see if there are any other users with location data
-- Run this in your Supabase SQL editor

-- Check all users with location data
select 
  user_id,
  display_name,
  geo_opt_in,
  lat,
  lng,
  visibility
from profiles 
where geo_opt_in = true 
  and lat is not null 
  and lng is not null
order by created_at desc;

-- Check total count of users with location sharing enabled
select count(*) as users_with_location
from profiles 
where geo_opt_in = true 
  and lat is not null 
  and lng is not null;

-- Test the distance calculation manually for your location (42.89456, 12.62714)
-- This will show all users within 100km of your location
select 
  user_id,
  display_name,
  lat,
  lng,
  (111.045 * acos( least(1.0, cos(radians(42.89456)) * cos(radians(lat)) *
      cos(radians(lng) - radians(12.62714)) + sin(radians(42.89456)) *
      sin(radians(lat))))) as distance_km
from profiles 
where geo_opt_in = true 
  and lat is not null 
  and lng is not null
  and user_id != '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'
  and (111.045 * acos( least(1.0, cos(radians(42.89456)) * cos(radians(lat)) *
      cos(radians(lng) - radians(12.62714)) + sin(radians(42.89456)) *
      sin(radians(lat))))) <= 100
order by distance_km asc;
