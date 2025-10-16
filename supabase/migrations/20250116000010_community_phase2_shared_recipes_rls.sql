-- Enable RLS on shared_recipes table
ALTER TABLE public.shared_recipes ENABLE ROW LEVEL SECURITY;

-- Policies for shared_recipes table
-- Anyone can read shared recipes from public groups
CREATE POLICY "Anyone can read shared recipes from public groups" ON public.shared_recipes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.groups 
            WHERE groups.group_id = shared_recipes.group_id 
            AND groups.is_public = true
        )
    );

-- Group members can read shared recipes from their groups
CREATE POLICY "Group members can read shared recipes from their groups" ON public.shared_recipes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_members.group_id = shared_recipes.group_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Group members can create shared recipes in their groups
CREATE POLICY "Group members can create shared recipes in their groups" ON public.shared_recipes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_members.group_id = shared_recipes.group_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Recipe owners can delete their shared recipes
CREATE POLICY "Recipe owners can delete their shared recipes" ON public.shared_recipes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_recipes 
            WHERE user_recipes.user_recipe_id = shared_recipes.recipe_id 
            AND user_recipes.user_id = auth.uid()
        )
    );

-- Group owners can delete any shared recipes in their groups
CREATE POLICY "Group owners can delete shared recipes in their groups" ON public.shared_recipes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.groups 
            WHERE groups.group_id = shared_recipes.group_id 
            AND groups.owner_id = auth.uid()
        )
    );
