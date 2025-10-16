-- Add pantry field to profiles table
-- This stores an array of ingredient IDs that the user always has in their pantry

-- Add the pantry column as an array of integers (ingredient IDs)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pantry_ingredients integer[] DEFAULT '{}';

-- Add index for faster queries on pantry ingredients
CREATE INDEX IF NOT EXISTS idx_profiles_pantry_ingredients ON public.profiles USING gin(pantry_ingredients);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pantry_ingredients IS 'Array of ingredient IDs representing ingredients the user always has in their pantry';

-- Log the results
DO $$
DECLARE
  total_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  RAISE NOTICE 'Migration complete: Added pantry_ingredients column to % profiles', total_profiles;
END $$;
