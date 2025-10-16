-- Community Phase 1: Extend recipes table for global cookbook
-- 02_recipes_extend_for_global.sql

-- Add columns to recipes table for global cookbook functionality
alter table public.user_recipes
  add column if not exists is_global boolean not null default false,
  add column if not exists global_status text check (global_status in ('pending','accepted','rejected')) default null,
  add column if not exists accepted_at timestamptz;

-- Add indexes for global recipe queries
create index if not exists idx_user_recipes_global_status on public.user_recipes(is_global, global_status) where is_global = true;
create index if not exists idx_user_recipes_accepted_at on public.user_recipes(accepted_at) where accepted_at is not null;

-- Add comment for clarity
comment on column public.user_recipes.is_global is 'Whether this recipe is part of the global cookbook';
comment on column public.user_recipes.global_status is 'Status in global cookbook: pending, accepted, or rejected';
comment on column public.user_recipes.accepted_at is 'When the recipe was accepted into the global cookbook';
