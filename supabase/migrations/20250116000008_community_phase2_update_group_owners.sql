-- Update all groups to have the specified owner_id
UPDATE public.groups 
SET owner_id = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64'
WHERE owner_id IS NULL;

-- Verify the update
SELECT group_id, name, owner_id FROM public.groups LIMIT 5;
