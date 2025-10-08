-- Recipe Chef Database Schema
-- Run this in your Supabase SQL editor

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
insert into public.settings (key, value) values
  ('prices', '{"one_time": 9.99, "monthly_ai": 0.99}'::jsonb),
  ('thresholds', '{"my_search": 0.50, "global_search": 0.75, "global_minimum": 0.50}'::jsonb),
  ('trial_days', '14'::jsonb)
on conflict (key) do nothing;

-- Ingredients & Taxonomy
create table if not exists public.cuisines (
  cuisine_id serial primary key,
  name text unique not null
);

create table if not exists public.meal_types (
  meal_type_id serial primary key,
  name text unique not null  -- Appetizer, Entrée, Side Dish, Dessert, Soup, Cocktails
);

create table if not exists public.ingredient_categories (
  category_id serial primary key,
  name text unique not null  -- Proteins, Vegetables, Fruits, Grains, Sauces, Spices, Dairy, Baking
);

create table if not exists public.ingredients (
  ingredient_id serial primary key,
  name text unique not null,
  category_id int not null references public.ingredient_categories(category_id) on delete restrict
);

-- Equipment
create table if not exists public.equipment (
  equipment_id serial primary key,
  name text unique not null
);

-- Global Cookbook (moderated)
create table if not exists public.global_recipes (
  recipe_id bigserial primary key,
  title text not null,
  description text,
  image_url text,
  video_url text,
  cuisine_id int references public.cuisines(cuisine_id),
  meal_type_id int references public.meal_types(meal_type_id),
  servings text,
  difficulty text check (difficulty in ('Easy','Medium','Hard','Very Hard')),
  prep_time text,
  cook_time text,
  total_time text,
  source_name text,
  source_url text,
  diet text, -- Vegan, Vegetarian, Keto, Gluten-Free, Dairy-Free, Low-Carb, etc.
  is_published boolean not null default true,   -- visible in Global Cookbook
  added_count int not null default 0,           -- how many user cookbooks added this
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

-- Full text / fuzzy indexes
create index if not exists idx_global_recipes_title_trgm on public.global_recipes using gin (title gin_trgm_ops);

-- Recipe body (ingredients, steps, equipment)
create table if not exists public.global_recipe_ingredients (
  id bigserial primary key,
  recipe_id bigint not null references public.global_recipes(recipe_id) on delete cascade,
  ingredient_id int not null references public.ingredients(ingredient_id),
  amount text, -- store as text to accept "200 g", "1 cup" (UI can parse for scaling)
  unit text
);

create table if not exists public.global_recipe_steps (
  id bigserial primary key,
  recipe_id bigint not null references public.global_recipes(recipe_id) on delete cascade,
  step_number int not null,
  text text not null
);

create table if not exists public.global_recipe_equipment (
  id bigserial primary key,
  recipe_id bigint not null references public.global_recipes(recipe_id) on delete cascade,
  equipment_id int not null references public.equipment(equipment_id)
);

-- Tags
create table if not exists public.tags (
  tag_id serial primary key,
  name text unique not null
);
create table if not exists public.global_recipe_tags (
  recipe_id bigint references public.global_recipes(recipe_id) on delete cascade,
  tag_id int references public.tags(tag_id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- Moderation queue for Global candidates
create table if not exists public.global_candidates (
  candidate_id bigserial primary key,
  submitted_by uuid references public.profiles(user_id),
  data jsonb not null,            -- normalized recipe payload
  source text,
  allow_global boolean not null default true, -- user opt-out => false
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderator_id uuid references public.profiles(user_id),
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- User Cookbook (personal)
create table if not exists public.user_recipes (
  user_recipe_id bigserial primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  recipe_id bigint references public.global_recipes(recipe_id), -- if derived from global
  title text not null,
  description text,
  image_url text,
  cuisine_id int references public.cuisines(cuisine_id),
  meal_type_id int references public.meal_types(meal_type_id),
  servings text,
  difficulty text,
  prep_time text, cook_time text, total_time text,
  source_name text, source_url text,
  diet text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

-- Full text / fuzzy indexes for user recipes
create index if not exists idx_user_recipes_title_trgm on public.user_recipes using gin (title gin_trgm_ops);

-- User recipe body
create table if not exists public.user_recipe_ingredients (
  id bigserial primary key,
  user_recipe_id bigint not null references public.user_recipes(user_recipe_id) on delete cascade,
  ingredient_id int references public.ingredients(ingredient_id),
  raw_name text, -- for arbitrary text ingredients
  amount text,
  unit text
);
create table if not exists public.user_recipe_steps (
  id bigserial primary key,
  user_recipe_id bigint not null references public.user_recipes(user_recipe_id) on delete cascade,
  step_number int not null,
  text text not null
);
create table if not exists public.user_recipe_equipment (
  id bigserial primary key,
  user_recipe_id bigint not null references public.user_recipes(user_recipe_id) on delete cascade,
  equipment_id int references public.equipment(equipment_id)
);
create table if not exists public.user_recipe_tags (
  user_recipe_id bigint references public.user_recipes(user_recipe_id) on delete cascade,
  tag_id int references public.tags(tag_id) on delete cascade,
  primary key (user_recipe_id, tag_id)
);

-- Ratings (1..5 chef hats)
create table if not exists public.ratings (
  id bigserial primary key,
  user_id uuid references public.profiles(user_id) on delete cascade,
  recipe_scope text not null check (recipe_scope in ('global','user')),
  recipe_key bigint not null, -- recipe_id or user_recipe_id
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, recipe_scope, recipe_key)
);

-- AI Feedback Loop
create table if not exists public.ai_feedback (
  id bigserial primary key,
  user_id uuid references public.profiles(user_id) on delete cascade,
  query text not null,
  result_source text not null check (result_source in ('global','openai')),
  is_useful boolean,
  created_at timestamptz not null default now()
);

-- Aggregation: increment global.added_count when a global recipe is added to a user cookbook
create or replace function public.inc_added_count()
returns trigger language plpgsql as $$
begin
  if new.recipe_id is not null then
    update public.global_recipes set added_count = added_count + 1 where recipe_id = new.recipe_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_inc_added_count on public.user_recipes;
create trigger trg_inc_added_count after insert on public.user_recipes
for each row execute function public.inc_added_count();

-- Calendar (menu planning) + Shopping list generation
create table if not exists public.meal_plan (
  id bigserial primary key,
  user_id uuid references public.profiles(user_id) on delete cascade,
  date date not null,
  user_recipe_id bigint references public.user_recipes(user_recipe_id),
  global_recipe_id bigint references public.global_recipes(recipe_id),
  unique (user_id, date, user_recipe_id, global_recipe_id)
);

-- Shopping list snapshots
create table if not exists public.shopping_lists (
  id bigserial primary key,
  user_id uuid references public.profiles(user_id) on delete cascade,
  from_date date not null,
  to_date date not null,
  items jsonb not null, -- grouped by category
  created_at timestamptz not null default now()
);

-- Import logs
create table if not exists public.import_logs (
  id bigserial primary key,
  user_id uuid references public.profiles(user_id),
  source_url text,
  status text not null check (status in ('success','fallback','failed')),
  message text,
  created_at timestamptz not null default now()
);

-- Chef Tony Lines (Appendix B)
create table if not exists public.ouioui_lines (
  line_id serial primary key,
  type text not null check (type in ('greeting', 'joke', 'tip')),
  text text not null,
  locale text not null default 'en',
  weight int not null default 1,
  created_at timestamptz not null default now()
);

-- RPC for getting random OuiOui lines
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
      exit;
    end if;
  end loop;
end; $$;

-- Seed Chef Tony Lines
insert into public.ouioui_lines (type, text, locale, weight) values
-- Greetings
('greeting', 'Bonjour! Welcome to Recipe Chef!', 'en', 1),
('greeting', 'Salut! Ready to cook something amazing?', 'en', 1),
('greeting', 'Bonsoir! Time to discover new flavors!', 'en', 1),
('greeting', 'Coucou! Let''s make magic in the kitchen!', 'en', 1),
('greeting', 'Hello there, mon ami! What shall we cook today?', 'en', 1),
('greeting', 'Bon appétit awaits! Welcome to your culinary journey!', 'en', 1),

-- Jokes
('joke', 'Why don''t eggs tell jokes? They''d crack each other up!', 'en', 1),
('joke', 'What do you call a fake noodle? An impasta!', 'en', 1),
('joke', 'Why did the tomato turn red? Because it saw the salad dressing!', 'en', 1),
('joke', 'What''s a chef''s favorite type of music? Sauté music!', 'en', 1),
('joke', 'Why don''t chefs ever get lost? Because they always know which way is whisk!', 'en', 1),
('joke', 'What do you call a bear with no teeth? A gummy bear!', 'en', 1),
('joke', 'Why did the chef go to art school? To learn how to make a masterpiece!', 'en', 1),
('joke', 'What''s a vampire''s favorite fruit? A blood orange!', 'en', 1),

-- Tips
('tip', 'Always taste your food while cooking - your palate is your best guide!', 'en', 1),
('tip', 'Mise en place! Prepare all ingredients before you start cooking.', 'en', 1),
('tip', 'Don''t overcrowd the pan - give your ingredients room to breathe!', 'en', 1),
('tip', 'Salt early and often - it brings out the natural flavors!', 'en', 1),
('tip', 'Keep your knives sharp - a dull knife is more dangerous than a sharp one!', 'en', 1),
('tip', 'Let meat rest after cooking - it''s worth the wait!', 'en', 1),
('tip', 'Fresh herbs at the end - they lose their magic if cooked too long!', 'en', 1),
('tip', 'Trust your instincts - cooking is an art, not just science!', 'en', 1);

-- Seed initial data
insert into public.cuisines (name) values
('American'), ('Italian'), ('French'), ('Mexican'), ('Asian'), ('Indian'), ('Mediterranean'), 
('Chinese'), ('Japanese'), ('Thai'), ('Korean'), ('Spanish'), ('German'), ('British'), ('Other')
on conflict (name) do nothing;

insert into public.meal_types (name) values
('Appetizer'), ('Entrée'), ('Side Dish'), ('Dessert'), ('Soup'), ('Salad'), ('Beverage'), ('Breakfast'), ('Lunch'), ('Dinner'), ('Snack')
on conflict (name) do nothing;

insert into public.ingredient_categories (name) values
('Proteins'), ('Vegetables'), ('Fruits'), ('Grains'), ('Sauces'), ('Spices'), ('Dairy'), ('Baking'), ('Oils & Fats'), ('Nuts & Seeds'), ('Herbs'), ('Condiments')
on conflict (name) do nothing;

insert into public.equipment (name) values
('Knife'), ('Cutting Board'), ('Pan'), ('Pot'), ('Skillet'), ('Oven'), ('Stovetop'), ('Blender'), ('Food Processor'), ('Mixer'), ('Grill'), ('Microwave'), ('Toaster'), ('Slow Cooker'), ('Pressure Cooker')
on conflict (name) do nothing;

insert into public.tags (name) values
('Quick'), ('Easy'), ('Healthy'), ('Vegetarian'), ('Vegan'), ('Gluten-Free'), ('Dairy-Free'), ('Low-Carb'), ('Keto'), ('High-Protein'), ('Comfort Food'), ('Spicy'), ('Sweet'), ('Savory'), ('One-Pot'), ('Make-Ahead'), ('Freezer-Friendly'), ('Kid-Friendly')
on conflict (name) do nothing;

-- Sample ingredients
insert into public.ingredients (name, category_id) values
-- Proteins
('Chicken Breast', 1), ('Ground Beef', 1), ('Salmon', 1), ('Eggs', 1), ('Tofu', 1), ('Black Beans', 1),
-- Vegetables  
('Onion', 2), ('Garlic', 2), ('Tomatoes', 2), ('Bell Peppers', 2), ('Carrots', 2), ('Broccoli', 2),
-- Fruits
('Lemon', 3), ('Lime', 3), ('Apple', 3), ('Banana', 3), ('Avocado', 3), ('Strawberries', 3),
-- Grains
('Rice', 4), ('Pasta', 4), ('Bread', 4), ('Quinoa', 4), ('Oats', 4), ('Flour', 4),
-- Dairy
('Milk', 7), ('Cheese', 7), ('Butter', 7), ('Yogurt', 7), ('Cream', 7), ('Sour Cream', 7),
-- Spices
('Salt', 6), ('Black Pepper', 6), ('Paprika', 6), ('Cumin', 6), ('Oregano', 6), ('Basil', 6)
on conflict (name) do nothing;

-- RLS Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_recipes enable row level security;
alter table public.user_recipe_ingredients enable row level security;
alter table public.user_recipe_steps enable row level security;
alter table public.user_recipe_equipment enable row level security;
alter table public.user_recipe_tags enable row level security;
alter table public.global_recipes enable row level security;
alter table public.global_recipe_ingredients enable row level security;
alter table public.global_recipe_steps enable row level security;
alter table public.global_recipe_equipment enable row level security;
alter table public.global_recipe_tags enable row level security;
alter table public.global_candidates enable row level security;
alter table public.ratings enable row level security;
alter table public.meal_plan enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.import_logs enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- User recipes policies (owner only)
create policy "Users can view own recipes" on public.user_recipes
  for select using (auth.uid() = user_id);

create policy "Users can insert own recipes" on public.user_recipes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own recipes" on public.user_recipes
  for update using (auth.uid() = user_id);

create policy "Users can delete own recipes" on public.user_recipes
  for delete using (auth.uid() = user_id);

-- User recipe components policies
create policy "Users can manage own recipe ingredients" on public.user_recipe_ingredients
  for all using (
    exists (
      select 1 from public.user_recipes
      where user_recipe_id = user_recipes.user_recipe_id and user_id = auth.uid()
    )
  );

create policy "Users can manage own recipe steps" on public.user_recipe_steps
  for all using (
    exists (
      select 1 from public.user_recipes
      where user_recipe_id = user_recipes.user_recipe_id and user_id = auth.uid()
    )
  );

create policy "Users can manage own recipe equipment" on public.user_recipe_equipment
  for all using (
    exists (
      select 1 from public.user_recipes
      where user_recipe_id = user_recipes.user_recipe_id and user_id = auth.uid()
    )
  );

create policy "Users can manage own recipe tags" on public.user_recipe_tags
  for all using (
    exists (
      select 1 from public.user_recipes
      where user_recipe_id = user_recipes.user_recipe_id and user_id = auth.uid()
    )
  );

-- Global recipes policies
create policy "Anyone can view published global recipes" on public.global_recipes
  for select using (is_published = true);

create policy "Admins and moderators can manage global recipes" on public.global_recipes
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Anyone can view published global recipe ingredients" on public.global_recipe_ingredients
  for select using (
    exists (
      select 1 from public.global_recipes
      where recipe_id = global_recipes.recipe_id and is_published = true
    )
  );

create policy "Admins and moderators can manage global recipe ingredients" on public.global_recipe_ingredients
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Anyone can view published global recipe steps" on public.global_recipe_steps
  for select using (
    exists (
      select 1 from public.global_recipes
      where recipe_id = global_recipes.recipe_id and is_published = true
    )
  );

create policy "Admins and moderators can manage global recipe steps" on public.global_recipe_steps
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Anyone can view published global recipe equipment" on public.global_recipe_equipment
  for select using (
    exists (
      select 1 from public.global_recipes
      where recipe_id = global_recipes.recipe_id and is_published = true
    )
  );

create policy "Admins and moderators can manage global recipe equipment" on public.global_recipe_equipment
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "Anyone can view published global recipe tags" on public.global_recipe_tags
  for select using (
    exists (
      select 1 from public.global_recipes
      where recipe_id = global_recipes.recipe_id and is_published = true
    )
  );

create policy "Admins and moderators can manage global recipe tags" on public.global_recipe_tags
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- Global candidates policies
create policy "Users can view own candidates" on public.global_candidates
  for select using (auth.uid() = submitted_by);

create policy "Users can insert candidates" on public.global_candidates
  for insert with check (auth.uid() = submitted_by);

create policy "Admins and moderators can manage all candidates" on public.global_candidates
  for all using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- Ratings policies (owner only)
create policy "Users can manage own ratings" on public.ratings
  for all using (auth.uid() = user_id);

-- Meal plan policies (owner only)
create policy "Users can manage own meal plan" on public.meal_plan
  for all using (auth.uid() = user_id);

-- Shopping lists policies (owner only)
create policy "Users can manage own shopping lists" on public.shopping_lists
  for all using (auth.uid() = user_id);

-- AI feedback policies (owner only)
create policy "Users can manage own AI feedback" on public.ai_feedback
  for all using (auth.uid() = user_id);

-- Import logs policies (owner only, admins can view all)
create policy "Users can view own import logs" on public.import_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own import logs" on public.import_logs
  for insert with check (auth.uid() = user_id);

create policy "Admins can view all import logs" on public.import_logs
  for select using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Public tables (no RLS needed)
-- cuisines, meal_types, ingredient_categories, ingredients, equipment, tags, settings, ouioui_lines

-- Function to handle new user signup
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

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
