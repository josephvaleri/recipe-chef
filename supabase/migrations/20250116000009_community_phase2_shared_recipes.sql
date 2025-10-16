-- Create shared_recipes table for group recipe sharing
CREATE TABLE IF NOT EXISTS public.shared_recipes (
    shared_recipe_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES public.user_recipes(user_recipe_id) ON DELETE CASCADE,
    shared_by_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    message TEXT,
    share_type TEXT NOT NULL CHECK (share_type IN ('group', 'specific')),
    recipients UUID[] DEFAULT '{}',
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_recipes_group_id ON public.shared_recipes(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_recipes_recipe_id ON public.shared_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shared_recipes_shared_by_id ON public.shared_recipes(shared_by_id);
CREATE INDEX IF NOT EXISTS idx_shared_recipes_shared_at ON public.shared_recipes(shared_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_shared_recipes_updated_at BEFORE UPDATE ON public.shared_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.shared_recipes IS 'Tracks recipes shared within groups';
COMMENT ON COLUMN public.shared_recipes.share_type IS 'Whether shared to entire group or specific members';
COMMENT ON COLUMN public.shared_recipes.recipients IS 'Array of user IDs for specific sharing (empty for group sharing)';
