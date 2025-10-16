-- Community Phase 1: RLS policies for groups and recipes
-- 04_groups_rls.sql

-- Enable RLS on new tables
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_cookbooks enable row level security;

-- Groups policies
-- Public readable for discovery
create policy "Groups are publicly readable" on public.groups
  for select using (true);

-- Authenticated users can create groups
create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() is not null);

-- Owners can update their groups
create policy "Group owners can update their groups" on public.groups
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Owners can delete their groups
create policy "Group owners can delete their groups" on public.groups
  for delete using (owner_id = auth.uid());

-- Group members policies
-- Anyone can read group memberships
create policy "Group memberships are publicly readable" on public.group_members
  for select using (true);

-- Users can join groups
create policy "Users can join groups" on public.group_members
  for insert with check (profile_id = auth.uid());

-- Users can leave groups, owners can remove members
create policy "Users can manage their group memberships" on public.group_members
  for delete using (
    profile_id = auth.uid() or 
    exists (
      select 1 from public.groups g 
      where g.group_id = group_members.group_id 
      and g.owner_id = auth.uid()
    )
  );

-- Group cookbooks policies (Phase 2 stub)
-- Group owners can manage their group cookbooks
create policy "Group owners can manage group cookbooks" on public.group_cookbooks
  for all using (
    exists (
      select 1 from public.groups g 
      where g.group_id = group_cookbooks.group_id 
      and g.owner_id = auth.uid()
    )
  );

-- Ensure recipes table has public read access for global recipes
-- (This might already exist, but let's make sure)
create policy "Global recipes are publicly readable" on public.user_recipes
  for select using (is_global = true and global_status = 'accepted');
