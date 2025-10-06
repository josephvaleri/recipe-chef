-- Check if global_candidates table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'global_candidates' 
AND table_schema = 'public'
ORDER BY ordinal_position;
