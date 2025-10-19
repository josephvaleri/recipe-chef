-- ===== PREREQS (safe to re-run) =============================================
create extension if not exists pg_trgm;

alter table public.profiles enable row level security;

-- Starter policy: allow authenticated users to SELECT rows (we still gate with can_view_profile in RPCs)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_authenticated'
  ) then
    create policy profiles_select_authenticated
      on public.profiles
      for select
      using (auth.role() = 'authenticated');
  end if;
end$$;

-- Search indexes
create index if not exists idx_profiles_display_name_trgm on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists idx_profiles_full_name_trgm    on public.profiles using gin (full_name gin_trgm_ops);

-- ===== RELATION HELPERS (use existing tables) ================================
-- user_friends(user_id, friend_id), user_follows(follower_id, followee_id)

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_friends f
    where (f.user_id = a and f.friend_id = b)
       or (f.user_id = b and f.friend_id = a)
  );
$$;

create or replace function public.i_follow(a uuid, b uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_follows fo
    where fo.follower_id = a and fo.followee_id = b
  );
$$;

-- visibility: public.user_visibility enum already exists in profiles.visibility
create or replace function public.can_view_profile(viewer uuid, owner uuid)
returns boolean language sql stable as $$
  select case p.visibility
    when 'ANYONE' then true
    when 'FRIENDS_AND_FOLLOWERS' then public.are_friends(viewer, owner) or public.i_follow(viewer, owner)
    when 'FRIENDS_ONLY' then public.are_friends(viewer, owner)
    else false
  end
  from public.profiles p
  where p.user_id = owner;
$$;

create or replace function public.safe_display_name(viewer uuid, owner uuid, fallback text default 'Anonymous')
returns text language sql stable as $$
  select case when public.can_view_profile(viewer, owner)
              then coalesce(p.display_name, p.full_name)
              else fallback
         end
  from public.profiles p
  where p.user_id = owner;
$$;

-- ===== RPC #1: People Like You ==============================================
-- Uses diet_type, skill_level, favorite_cuisine (present in profiles)
create or replace function public.discover_people_like_you_v2(p_limit int default 20)
returns table (
  user_id uuid,
  display_name text,
  score numeric
) language sql stable as $$
  with me as (
    select diet_type, skill_level, favorite_cuisine
    from public.profiles
    where user_id = auth.uid()
  )
  select p.user_id,
         public.safe_display_name(auth.uid(), p.user_id, 'Anonymous') as display_name,
         (
           (case when p.diet_type        = (select diet_type        from me) then 1 else 0 end) +
           (case when p.skill_level      = (select skill_level      from me) then 1 else 0 end) +
           (case when p.favorite_cuisine = (select favorite_cuisine from me) then 1 else 0 end)
         )::numeric as score
  from public.profiles p
  where p.user_id <> auth.uid()
    and public.can_view_profile(auth.uid(), p.user_id) = true
  order by score desc nulls last, display_name asc
  limit p_limit;
$$;

-- ===== RPC #2: Search Profiles ==============================================
create or replace function public.search_profiles_v1(p_q text, p_limit int default 20)
returns table (
  user_id uuid,
  display_name text
) language sql stable as $$
  select p.user_id,
         public.safe_display_name(auth.uid(), p.user_id, 'Anonymous') as display_name
  from public.profiles p
  where p.user_id <> auth.uid()
    and public.can_view_profile(auth.uid(), p.user_id) = true
    and (
      p.display_name ilike '%' || p_q || '%'
      or p.full_name  ilike '%' || p_q || '%'
    )
  order by display_name asc
  limit p_limit;
$$;

-- ===== RPC #3: Near Me =======================================================
-- Uses geo_opt_in, lat, lng in profiles
create or replace function public.discover_near_me_v2(p_radius_km numeric default 50)
returns table (
  user_id uuid,
  display_name text,
  distance_km numeric
) language sql stable as $$
  with me as (
    select lat as mlat, lng as mlng
    from public.profiles
    where user_id = auth.uid() and geo_opt_in = true
  )
  select p.user_id,
         public.safe_display_name(auth.uid(), p.user_id, 'Anonymous') as display_name,
         (111.045 * acos(least(1.0,
           cos(radians((select mlat from me))) * cos(radians(p.lat)) *
           cos(radians(p.lng) - radians((select mlng from me))) +
           sin(radians((select mlat from me))) * sin(radians(p.lat))
         ))) as distance_km
  from public.profiles p
  where p.user_id <> auth.uid()
    and p.geo_opt_in = true
    and (select mlat from me) is not null
    and public.can_view_profile(auth.uid(), p.user_id) = true
    and (111.045 * acos(least(1.0,
           cos(radians((select mlat from me))) * cos(radians(p.lat)) *
           cos(radians(p.lng) - radians((select mlng from me))) +
           sin(radians((select mlat from me))) * sin(radians(p.lat))
         ))) <= p_radius_km
  order by distance_km asc;
$$;

-- ===== Grants (optional if you use RLS + default) ============================
grant execute on function public.discover_people_like_you_v2(int) to authenticated;
grant execute on function public.search_profiles_v1(text,int)     to authenticated;
grant execute on function public.discover_near_me_v2(numeric)     to authenticated;
grant execute on function public.can_view_profile(uuid,uuid)      to authenticated;
grant execute on function public.safe_display_name(uuid,uuid,text)to authenticated;
