-- Fix RLS Policies Script for Recipe Chef
-- This script fixes the infinite recursion issue in profiles policies

-- Drop all existing problematic policies on profiles table
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Recreate the profiles policies without recursion
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- For admin access, we'll use a different approach
-- Instead of recursive policies, we'll use a function or handle it in the application layer
-- For now, let's create a simple policy that allows admins to view all profiles
-- but we'll need to be careful about the implementation

-- Create a function to check if user is admin (this avoids recursion)
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
end;
$$;

-- Create a function to check if user is moderator or admin
create or replace function public.is_moderator_or_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'moderator')
  );
end;
$$;

-- Now create the admin policy using the function
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

-- Update other policies that reference profiles table to use functions
drop policy if exists "Admins and moderators can manage global recipes" on public.global_recipes;
create policy "Admins and moderators can manage global recipes" on public.global_recipes
  for all using (public.is_moderator_or_admin());

drop policy if exists "Admins and moderators can manage global recipe ingredients" on public.global_recipe_ingredients;
create policy "Admins and moderators can manage global recipe ingredients" on public.global_recipe_ingredients
  for all using (public.is_moderator_or_admin());

drop policy if exists "Admins and moderators can manage global recipe steps" on public.global_recipe_steps;
create policy "Admins and moderators can manage global recipe steps" on public.global_recipe_steps
  for all using (public.is_moderator_or_admin());

drop policy if exists "Admins and moderators can manage global recipe equipment" on public.global_recipe_equipment;
create policy "Admins and moderators can manage global recipe equipment" on public.global_recipe_equipment
  for all using (public.is_moderator_or_admin());

drop policy if exists "Admins and moderators can manage global recipe tags" on public.global_recipe_tags;
create policy "Admins and moderators can manage global recipe tags" on public.global_recipe_tags
  for all using (public.is_moderator_or_admin());

drop policy if exists "Admins and moderators can manage all candidates" on public.global_candidates;
create policy "Admins and moderators can manage all candidates" on public.global_candidates
  for all using (public.is_moderator_or_admin());

drop policy if exists "Admins can view all import logs" on public.import_logs;
create policy "Admins can view all import logs" on public.import_logs
  for select using (public.is_admin());

-- Success message
select 'RLS policies fixed successfully!' as message;
