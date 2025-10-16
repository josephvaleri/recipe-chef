-- Create discussions table for group discussions
CREATE TABLE IF NOT EXISTS public.discussions (
    discussion_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discussion replies table
CREATE TABLE IF NOT EXISTS public.discussion_replies (
    reply_id SERIAL PRIMARY KEY,
    discussion_id INTEGER NOT NULL REFERENCES public.discussions(discussion_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discussions_group_id ON public.discussions(group_id);
CREATE INDEX IF NOT EXISTS idx_discussions_author_id ON public.discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON public.discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON public.discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_author_id ON public.discussion_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_created_at ON public.discussion_replies(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON public.discussion_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
