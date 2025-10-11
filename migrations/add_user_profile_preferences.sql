-- User Profile Preferences Schema
-- Extends the profiles table with comprehensive user preferences

-- Add basic profile fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS preferred_units TEXT DEFAULT 'us' CHECK (preferred_units IN ('us', 'metric')),
ADD COLUMN IF NOT EXISTS interface_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS email TEXT;

-- Diet & Constraints
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS diet_type TEXT CHECK (diet_type IN ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'halal', 'kosher', 'other')),
ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]'::jsonb, -- Array of {allergen: string, severity: 'mild'|'moderate'|'severe'}
ADD COLUMN IF NOT EXISTS disliked_ingredients JSONB DEFAULT '[]'::jsonb; -- Array of ingredient names

-- Taste & Style
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS spice_tolerance INTEGER DEFAULT 3 CHECK (spice_tolerance BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS taste_preferences JSONB DEFAULT '{
  "sweet": 3,
  "sour": 3,
  "salty": 3,
  "bitter": 3,
  "umami": 3,
  "richness": 3
}'::jsonb,
ADD COLUMN IF NOT EXISTS texture_preferences JSONB DEFAULT '[]'::jsonb, -- Array of preferred textures
ADD COLUMN IF NOT EXISTS cuisine_affinities JSONB DEFAULT '{}'::jsonb; -- Object mapping cuisine to rating 1-5

-- Cooking Context
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'home_cook' CHECK (skill_level IN ('beginner', 'home_cook', 'advanced', 'professional')),
ADD COLUMN IF NOT EXISTS typical_time_cap INTEGER DEFAULT 45, -- Minutes for weeknight cooking
ADD COLUMN IF NOT EXISTS household_adults INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS household_kids INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_servings INTEGER DEFAULT 4;

-- Equipment on Hand
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS available_equipment JSONB DEFAULT '[]'::jsonb; -- Array of equipment names

-- Behavior & Social
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS privacy_public_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_share_collections BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_anonymous_reviews BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cooking_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb; -- Array of earned badges

-- Payment (basic reference - actual payment handled by payment provider)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_provider TEXT, -- 'stripe', 'paypal', etc.
ADD COLUMN IF NOT EXISTS payment_customer_id TEXT, -- External customer ID
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'active', 'cancelled', 'expired'));

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_profiles_diet_type ON public.profiles(diet_type);
CREATE INDEX IF NOT EXISTS idx_profiles_skill_level ON public.profiles(skill_level);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_profile_updated_at ON public.profiles;
CREATE TRIGGER trg_update_profile_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_updated_at();

-- Comment on table
COMMENT ON TABLE public.profiles IS 'User profiles with comprehensive preferences for personalized recipe recommendations';

