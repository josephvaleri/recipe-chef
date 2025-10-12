-- Verify and create global_candidates table if it doesn't exist
-- This table is used for the moderation queue

-- Check if table exists
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

-- If the table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.global_candidates (
  candidate_id bigserial PRIMARY KEY,
  submitted_by uuid REFERENCES public.profiles(user_id),
  data jsonb NOT NULL,            -- normalized recipe payload
  source text,
  allow_global boolean NOT NULL DEFAULT true, -- user opt-out => false
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  moderator_id uuid REFERENCES public.profiles(user_id),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

-- Enable RLS if not already enabled
ALTER TABLE public.global_candidates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Users can view own candidates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'global_candidates' 
        AND policyname = 'Users can view own candidates'
    ) THEN
        CREATE POLICY "Users can view own candidates" ON public.global_candidates
          FOR SELECT USING (auth.uid() = submitted_by);
    END IF;

    -- Users can insert candidates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'global_candidates' 
        AND policyname = 'Users can insert candidates'
    ) THEN
        CREATE POLICY "Users can insert candidates" ON public.global_candidates
          FOR INSERT WITH CHECK (auth.uid() = submitted_by);
    END IF;

    -- Admins and moderators can manage all candidates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'global_candidates' 
        AND policyname = 'Admins and moderators can manage all candidates'
    ) THEN
        CREATE POLICY "Admins and moderators can manage all candidates" ON public.global_candidates
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
            )
          );
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_candidates TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.global_candidates_candidate_id_seq TO authenticated;


