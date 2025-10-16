-- Enable RLS on group_owners table
ALTER TABLE public.group_owners ENABLE ROW LEVEL SECURITY;

-- Policies for group_owners table
-- Anyone can read group owners from public groups
CREATE POLICY "Anyone can read group owners from public groups" ON public.group_owners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.groups 
            WHERE groups.group_id = group_owners.group_id 
            AND groups.is_public = true
        )
    );

-- Group members can read group owners from their groups
CREATE POLICY "Group members can read group owners from their groups" ON public.group_owners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_members.group_id = group_owners.group_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Group owners can add new owners to their groups
CREATE POLICY "Group owners can add new owners to their groups" ON public.group_owners
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_owners go
            WHERE go.group_id = group_owners.group_id 
            AND go.owner_id = auth.uid()
        )
    );

-- Group owners can remove other owners from their groups (but not themselves)
CREATE POLICY "Group owners can remove other owners from their groups" ON public.group_owners
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.group_owners go
            WHERE go.group_id = group_owners.group_id 
            AND go.owner_id = auth.uid()
            AND go.owner_id != group_owners.owner_id
        )
    );
