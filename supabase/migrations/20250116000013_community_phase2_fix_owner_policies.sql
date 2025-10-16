-- Fix existing policies to use group_owners table instead of groups.owner_id
-- This migration updates policies that were created before the group_owners table

-- Drop old policies that reference groups.owner_id
DROP POLICY IF EXISTS "Group owners can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group owners can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can manage their group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Group owners can manage group cookbooks" ON public.group_cookbooks;
DROP POLICY IF EXISTS "Group owners can delete shared recipes in their groups" ON public.shared_recipes;

-- Recreate groups policies using group_owners table
CREATE POLICY "Group owners can update their groups" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_owners 
      WHERE group_owners.group_id = groups.group_id 
      AND group_owners.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_owners 
      WHERE group_owners.group_id = groups.group_id 
      AND group_owners.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can delete their groups" ON public.groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_owners 
      WHERE group_owners.group_id = groups.group_id 
      AND group_owners.owner_id = auth.uid()
    )
  );

-- Recreate group_members policies using group_owners table
CREATE POLICY "Users can manage their group memberships" ON public.group_members
  FOR DELETE USING (
    profile_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.group_owners go
      WHERE go.group_id = group_members.group_id 
      AND go.owner_id = auth.uid()
    )
  );

-- Recreate group_cookbooks policies using group_owners table
CREATE POLICY "Group owners can manage group cookbooks" ON public.group_cookbooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.group_owners go
      WHERE go.group_id = group_cookbooks.group_id 
      AND go.owner_id = auth.uid()
    )
  );

-- Recreate shared_recipes policies using group_owners table
CREATE POLICY "Group owners can delete shared recipes in their groups" ON public.shared_recipes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_owners go
      WHERE go.group_id = shared_recipes.group_id 
      AND go.owner_id = auth.uid()
    )
  );

-- Add policy for group owners to update group visibility
CREATE POLICY "Group owners can update group visibility" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_owners 
      WHERE group_owners.group_id = groups.group_id 
      AND group_owners.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_owners 
      WHERE group_owners.group_id = groups.group_id 
      AND group_owners.owner_id = auth.uid()
    )
  );
