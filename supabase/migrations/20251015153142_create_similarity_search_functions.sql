-- Create similarity search functions for recipe name matching
-- This creates PostgreSQL functions that use trigram similarity for fuzzy matching

-- Function to search user recipes by similarity
CREATE OR REPLACE FUNCTION search_user_recipes_by_similarity(
  search_term TEXT,
  similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE (
  user_recipe_id BIGINT,
  user_id UUID,
  recipe_id BIGINT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  cuisine_id INTEGER,
  meal_type_id INTEGER,
  servings TEXT,
  difficulty TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  source_name TEXT,
  source_url TEXT,
  diet TEXT,
  is_favorite BOOLEAN,
  created_at TIMESTAMPTZ,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.user_recipe_id,
    ur.user_id,
    ur.recipe_id,
    ur.title,
    ur.description,
    ur.image_url,
    ur.cuisine_id,
    ur.meal_type_id,
    ur.servings,
    ur.difficulty,
    ur.prep_time,
    ur.cook_time,
    ur.total_time,
    ur.source_name,
    ur.source_url,
    ur.diet,
    ur.is_favorite,
    ur.created_at,
    similarity(ur.title, search_term) AS similarity
  FROM user_recipes ur
  WHERE similarity(ur.title, search_term) >= similarity_threshold
  ORDER BY similarity DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search global recipes by similarity
CREATE OR REPLACE FUNCTION search_global_recipes_by_similarity(
  search_term TEXT,
  similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE (
  recipe_id BIGINT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  cuisine_id INTEGER,
  meal_type_id INTEGER,
  servings TEXT,
  difficulty TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  source_name TEXT,
  source_url TEXT,
  diet TEXT,
  is_published BOOLEAN,
  added_count INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.recipe_id,
    gr.title,
    gr.description,
    gr.image_url,
    gr.video_url,
    gr.cuisine_id,
    gr.meal_type_id,
    gr.servings,
    gr.difficulty,
    gr.prep_time,
    gr.cook_time,
    gr.total_time,
    gr.source_name,
    gr.source_url,
    gr.diet,
    gr.is_published,
    gr.added_count,
    gr.created_by,
    gr.created_at,
    similarity(gr.title, search_term) AS similarity
  FROM global_recipes gr
  WHERE similarity(gr.title, search_term) >= similarity_threshold
    AND gr.is_published = true
  ORDER BY similarity DESC;
END;
$$ LANGUAGE plpgsql;

-- Ensure pg_trgm extension is enabled (should already be in schema)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
