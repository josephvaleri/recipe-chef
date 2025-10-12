-- Create user_recipe_ingredients_detail table to store detailed ingredient analysis results
CREATE TABLE user_recipe_ingredients_detail (
    detail_id SERIAL PRIMARY KEY,
    user_recipe_id INTEGER NOT NULL REFERENCES user_recipes(user_recipe_id) ON DELETE CASCADE,
    user_recipe_ingredient_id BIGINT REFERENCES user_recipe_ingredients(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    matched_term TEXT NOT NULL,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('exact', 'alias')),
    matched_alias TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_recipe_id, ingredient_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_recipe_ingredients_detail_recipe_id ON user_recipe_ingredients_detail(user_recipe_id);
CREATE INDEX idx_user_recipe_ingredients_detail_ingredient_id ON user_recipe_ingredients_detail(ingredient_id);
CREATE INDEX idx_user_recipe_ingredients_detail_ingredient_fk ON user_recipe_ingredients_detail(user_recipe_ingredient_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_recipe_ingredients_detail ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own recipe details
CREATE POLICY "Users can view their own recipe ingredient details" ON user_recipe_ingredients_detail
    FOR SELECT USING (
        user_recipe_id IN (
            SELECT user_recipe_id FROM user_recipes WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to insert their own recipe details
CREATE POLICY "Users can insert their own recipe ingredient details" ON user_recipe_ingredients_detail
    FOR INSERT WITH CHECK (
        user_recipe_id IN (
            SELECT user_recipe_id FROM user_recipes WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to update their own recipe details
CREATE POLICY "Users can update their own recipe ingredient details" ON user_recipe_ingredients_detail
    FOR UPDATE USING (
        user_recipe_id IN (
            SELECT user_recipe_id FROM user_recipes WHERE user_id = auth.uid()
        )
    );

-- Policy to allow users to delete their own recipe details
CREATE POLICY "Users can delete their own recipe ingredient details" ON user_recipe_ingredients_detail
    FOR DELETE USING (
        user_recipe_id IN (
            SELECT user_recipe_id FROM user_recipes WHERE user_id = auth.uid()
        )
    );


