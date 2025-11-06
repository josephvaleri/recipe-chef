-- Create a completely new, simpler version of discover_near_me
-- Based on the working manual query

drop function if exists public.discover_near_me(uuid, numeric);

create or replace function discover_near_me(p_user uuid, radius_km numeric default 50)
returns table(user_id uuid, distance_km numeric) language sql stable as $$
  select 
    p.user_id,
    (111.045 * acos( least(1.0, cos(radians(me.lat)) * cos(radians(p.lat)) *
        cos(radians(p.lng) - radians(me.lng)) + sin(radians(me.lat)) *
        sin(radians(p.lat))))) as distance_km
  from profiles me
  cross join profiles p
  where me.user_id = p_user 
    and me.geo_opt_in = true
    and me.lat is not null 
    and me.lng is not null
    and p.user_id <> p_user 
    and p.geo_opt_in = true
    and p.lat is not null 
    and p.lng is not null
    and (111.045 * acos( least(1.0, cos(radians(me.lat)) * cos(radians(p.lat)) *
        cos(radians(p.lng) - radians(me.lng)) + sin(radians(me.lat)) *
        sin(radians(p.lat))))) <= radius_km
  order by distance_km asc;
$$;

-- Test the new function
select 'Testing new discover_near_me function...' as message;
select * from discover_near_me('4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'::uuid, 50);
select 'New function created and tested!' as final_message;
