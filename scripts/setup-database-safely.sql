-- Safe Database Setup Script for Recipe Chef
-- This script handles existing objects gracefully

-- Extensions
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- Users / Profiles / Roles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('admin','moderator','user')),
  status text not null default 'active' check (status in ('active','inactive','trial')),
  has_ai_subscription boolean not null default false,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- Settings (admin-adjustable knobs)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Drop existing policies first, then recreate them
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Recreate policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own profile" on public.profiles
  for delete using (auth.uid() = user_id);

-- Chef OuiOui Lines
create table if not exists public.ouioui_lines (
  line_id serial primary key,
  type text not null check (type in ('greeting', 'joke', 'tip')),
  text text not null,
  locale text not null default 'en',
  weight int not null default 1,
  created_at timestamptz not null default now(),
  unique(type, text, locale)
);

-- Drop and recreate the RPC function
drop function if exists public.get_random_ouioui_line(text, text);

create or replace function public.get_random_ouioui_line(
  line_type text,
  locale text default 'en'
)
returns table(text text) language plpgsql as $$
declare
  total_weight int;
  random_num int;
  current_weight int := 0;
begin
  -- Get total weight for the given type and locale
  select coalesce(sum(weight), 0) into total_weight
  from public.ouioui_lines
  where type = line_type and locale = locale;
  
  if total_weight = 0 then
    -- Fallback to any locale
    select coalesce(sum(weight), 0) into total_weight
    from public.ouioui_lines
    where type = line_type;
  end if;
  
  if total_weight = 0 then
    return;
  end if;
  
  -- Generate random number
  random_num := floor(random() * total_weight) + 1;
  
  -- Find the line
  for text in
    select ol.text
    from public.ouioui_lines ol
    where ol.type = line_type and ol.locale = locale
    order by ol.line_id
  loop
    current_weight := current_weight + 1;
    if current_weight >= random_num then
      return next;
    end if;
  end loop;
end; $$;

-- Insert settings (with conflict handling)
insert into public.settings (key, value) values
  ('prices', '{"one_time": 9.99, "monthly_ai": 0.99}'::jsonb),
  ('thresholds', '{"my_search": 0.50, "global_search": 0.75, "global_minimum": 0.50}'::jsonb),
  ('trial_days', '14'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

-- Insert OuiOui lines (only if they don't exist)
insert into public.ouioui_lines (type, text, locale, weight) 
select * from (values
-- Greetings
('greeting', 'Bonjour! Welcome to Recipe Chef!', 'en', 1),
('greeting', 'Salut! Ready to cook something amazing?', 'en', 1),
('greeting', 'Bonsoir! Time to discover new flavors!', 'en', 1),
('greeting', 'Coucou! Let''s make magic in the kitchen!', 'en', 1),
('greeting', 'Allô! What delicious recipe shall we create today?', 'en', 1),
('greeting', 'Comment allez-vous? Ready for a culinary adventure?', 'en', 1),
('greeting', 'Enchanté! Let''s explore the world of flavors together!', 'en', 1),
('greeting', 'Très bien! Time to cook something extraordinary!', 'en', 1),
-- Jokes
('joke', 'Why don''t eggs tell jokes? They''d crack each other up!', 'en', 1),
('joke', 'What do you call a fake noodle? An impasta!', 'en', 1),
('joke', 'Why did the chef break up with the garlic? It was too clingy!', 'en', 1),
('joke', 'What''s a chef''s favorite type of music? Heavy metal!', 'en', 1),
('joke', 'Why don''t chefs ever get lost? Because they always know their way around the kitchen!', 'en', 1),
('joke', 'What do you call a chef who''s also a magician? A saucereer!', 'en', 1),
('joke', 'Why did the tomato turn red? Because it saw the salad dressing!', 'en', 1),
('joke', 'What''s a chef''s favorite exercise? The whisk workout!', 'en', 1),
-- Tips
('tip', 'Always taste your food while cooking - your palate is your best guide!', 'en', 1),
('tip', 'Keep your knives sharp - a dull knife is more dangerous than a sharp one!', 'en', 1),
('tip', 'Prep your ingredients before you start cooking - mise en place is everything!', 'en', 1),
('tip', 'Don''t be afraid to experiment with flavors - cooking is an art!', 'en', 1),
('tip', 'Season your food in layers - a little salt at each step makes a big difference!', 'en', 1),
('tip', 'Let your meat rest after cooking - it will be much more tender and juicy!', 'en', 1),
('tip', 'Use fresh herbs whenever possible - they bring dishes to life!', 'en', 1),
('tip', 'Keep your workspace clean - a tidy kitchen is a happy kitchen!', 'en', 1)
) as new_lines(type, text, locale, weight)
where not exists (
  select 1 from public.ouioui_lines existing 
  where existing.type = new_lines.type 
    and existing.text = new_lines.text 
    and existing.locale = new_lines.locale
);

-- Drop and recreate the new user trigger function (in correct order)
-- First drop the trigger that depends on the function
drop trigger if exists on_auth_user_created on auth.users;

-- Then drop the function
drop function if exists public.handle_new_user();

-- Recreate the function
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, full_name, role, status, trial_started_at, trial_ends_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'user',
    'trial',
    now(),
    now() + interval '14 days'
  );
  return new;
end; $$;

-- Recreate the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Success message
select 'Recipe Chef database setup completed successfully!' as message;
