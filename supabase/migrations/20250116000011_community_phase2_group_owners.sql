-- Create group_owners table to support multiple owners per group
CREATE TABLE IF NOT EXISTS public.group_owners (
    group_id INTEGER NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, owner_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_owners_group_id ON public.group_owners(group_id);
CREATE INDEX IF NOT EXISTS idx_group_owners_owner_id ON public.group_owners(owner_id);

-- Migrate existing owner_id from groups table to group_owners table
INSERT INTO public.group_owners (group_id, owner_id, assigned_at)
SELECT group_id, owner_id, created_at
FROM public.groups 
WHERE owner_id IS NOT NULL
ON CONFLICT (group_id, owner_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.group_owners IS 'Tracks multiple owners for each group';
COMMENT ON COLUMN public.group_owners.assigned_by IS 'User who assigned this owner (null for original owner)';
