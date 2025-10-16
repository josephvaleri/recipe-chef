-- Ensure all existing groups have their owners migrated to group_owners table
-- This is a safety migration to handle any groups that might have been missed

-- First, let's see what groups exist without owners in group_owners table
-- (This is just for debugging - we'll run the migration regardless)

-- Migrate any remaining owner_id from groups table to group_owners table
INSERT INTO public.group_owners (group_id, owner_id, assigned_at)
SELECT 
    g.group_id, 
    g.owner_id, 
    g.created_at
FROM public.groups g
WHERE g.owner_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.group_owners go 
    WHERE go.group_id = g.group_id 
    AND go.owner_id = g.owner_id
)
ON CONFLICT (group_id, owner_id) DO NOTHING;

-- Add a comment to track this migration
COMMENT ON TABLE public.group_owners IS 'Tracks multiple owners for each group - Migration completed on 2025-01-16';
