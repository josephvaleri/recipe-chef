-- Enable RLS on discussions tables
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

-- Policies for discussions table
-- Anyone can read discussions from public groups
CREATE POLICY "Anyone can read discussions from public groups" ON public.discussions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.groups 
            WHERE groups.group_id = discussions.group_id 
            AND groups.is_public = true
        )
    );

-- Group members can read discussions from their groups
CREATE POLICY "Group members can read discussions from their groups" ON public.discussions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_members.group_id = discussions.group_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Group members can create discussions in their groups
CREATE POLICY "Group members can create discussions in their groups" ON public.discussions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_members.group_id = discussions.group_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Discussion authors can update their own discussions
CREATE POLICY "Discussion authors can update their own discussions" ON public.discussions
    FOR UPDATE USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Discussion authors and group owners can delete discussions
CREATE POLICY "Discussion authors and group owners can delete discussions" ON public.discussions
    FOR DELETE USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.groups 
            WHERE groups.group_id = discussions.group_id 
            AND groups.owner_id = auth.uid()
        )
    );

-- Policies for discussion_replies table
-- Anyone can read replies to discussions from public groups
CREATE POLICY "Anyone can read replies from public group discussions" ON public.discussion_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.discussions 
            JOIN public.groups ON groups.group_id = discussions.group_id
            WHERE discussions.discussion_id = discussion_replies.discussion_id 
            AND groups.is_public = true
        )
    );

-- Group members can read replies to discussions from their groups
CREATE POLICY "Group members can read replies from their group discussions" ON public.discussion_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.discussions 
            JOIN public.group_members ON group_members.group_id = discussions.group_id
            WHERE discussions.discussion_id = discussion_replies.discussion_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Group members can create replies to discussions in their groups
CREATE POLICY "Group members can create replies to discussions in their groups" ON public.discussion_replies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.discussions 
            JOIN public.group_members ON group_members.group_id = discussions.group_id
            WHERE discussions.discussion_id = discussion_replies.discussion_id 
            AND group_members.profile_id = auth.uid()
        )
    );

-- Reply authors can update their own replies
CREATE POLICY "Reply authors can update their own replies" ON public.discussion_replies
    FOR UPDATE USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Reply authors and group owners can delete replies
CREATE POLICY "Reply authors and group owners can delete replies" ON public.discussion_replies
    FOR DELETE USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.discussions 
            JOIN public.groups ON groups.group_id = discussions.group_id
            WHERE discussions.discussion_id = discussion_replies.discussion_id 
            AND groups.owner_id = auth.uid()
        )
    );
