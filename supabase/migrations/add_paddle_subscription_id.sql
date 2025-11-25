-- Add paddle_subscription_id column to profiles table for Paddle Billing integration
-- This allows tracking which Paddle subscription is associated with each user

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

-- Create index for faster lookups by subscription ID
CREATE INDEX IF NOT EXISTS idx_profiles_paddle_subscription_id 
ON public.profiles(paddle_subscription_id) 
WHERE paddle_subscription_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.paddle_subscription_id IS 'Paddle Billing subscription ID for tracking user subscriptions';

