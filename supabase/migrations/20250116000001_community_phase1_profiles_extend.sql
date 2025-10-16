-- Community Phase 1: Extend profiles table with community features
-- 01_profiles_extend.sql

-- Add new columns to profiles table
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_choice text,
  add column if not exists house_specialties integer[] check (coalesce(array_length(house_specialties,1),0) <= 3),
  add column if not exists user_tag text unique,
  add column if not exists instagram_handle text,
  add column if not exists youtube_url text,
  add column if not exists is_verified_chef boolean not null default false,
  add column if not exists verified_by uuid references public.profiles (user_id) on delete set null,
  add column if not exists verified_at timestamptz;

-- Function to enforce user_tag prefix
create or replace function public.enforce_user_tag_prefix()
returns trigger language plpgsql as $$
begin
  if new.user_tag is not null and left(new.user_tag,1) <> '@' then
    new.user_tag := '@' || new.user_tag;
  end if;
  return new;
end $$;

-- Create trigger for user_tag prefix enforcement
drop trigger if exists trg_profiles_user_tag_prefix on public.profiles;
create trigger trg_profiles_user_tag_prefix
before insert or update on public.profiles
for each row execute function public.enforce_user_tag_prefix();

-- Add index for user_tag for faster lookups
create index if not exists idx_profiles_user_tag on public.profiles(user_tag) where user_tag is not null;

-- Add index for verified chefs
create index if not exists idx_profiles_verified_chef on public.profiles(is_verified_chef) where is_verified_chef = true;
