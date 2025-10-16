-- Create table for caching generated recipes to improve performance
CREATE TABLE IF NOT EXISTS public.recipe_cache (
  cache_id BIGSERIAL PRIMARY KEY,
  search_query TEXT NOT NULL,
  normalized_query TEXT NOT NULL, -- Normalized version for matching
  recipes JSONB NOT NULL, -- Cached recipe data
  search_type TEXT NOT NULL DEFAULT 'recipe_name_search', -- Type of search
  hit_count INTEGER NOT NULL DEFAULT 1, -- How many times this cache was used
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days') -- Cache expires after 7 days
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_recipe_cache_normalized_query ON public.recipe_cache (normalized_query);
CREATE INDEX IF NOT EXISTS idx_recipe_cache_expires_at ON public.recipe_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_recipe_cache_search_type ON public.recipe_cache (search_type);

-- Function to normalize search queries for consistent caching
CREATE OR REPLACE FUNCTION normalize_search_query(query TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(query, 'give me recipes? for', '', 'gi'),
          'recipes? for', '', 'gi'
        ),
        'how to make', '', 'gi'
      ),
      'how to cook', '', 'gi'
    )
  ));
END;
$$ LANGUAGE plpgsql;

-- Function to get cached recipes
CREATE OR REPLACE FUNCTION get_cached_recipes(
  search_query TEXT,
  search_type TEXT DEFAULT 'recipe_name_search'
)
RETURNS TABLE (
  cache_id BIGINT,
  recipes JSONB,
  hit_count INTEGER
) AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := normalize_search_query(search_query);
  
  RETURN QUERY
  SELECT 
    rc.cache_id,
    rc.recipes,
    rc.hit_count
  FROM recipe_cache rc
  WHERE rc.normalized_query = normalized_query
    AND rc.search_type = search_type
    AND rc.expires_at > NOW()
  ORDER BY rc.last_used_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to cache recipes
CREATE OR REPLACE FUNCTION cache_recipes(
  search_query TEXT,
  recipes_data JSONB,
  search_type TEXT DEFAULT 'recipe_name_search'
)
RETURNS BIGINT AS $$
DECLARE
  normalized_query TEXT;
  cache_id BIGINT;
BEGIN
  normalized_query := normalize_search_query(search_query);
  
  -- Check if cache already exists
  SELECT rc.cache_id INTO cache_id
  FROM recipe_cache rc
  WHERE rc.normalized_query = normalized_query
    AND rc.search_type = search_type
    AND rc.expires_at > NOW()
  LIMIT 1;
  
  IF cache_id IS NOT NULL THEN
    -- Update existing cache
    UPDATE recipe_cache 
    SET 
      recipes = recipes_data,
      hit_count = hit_count + 1,
      last_used_at = NOW(),
      expires_at = NOW() + INTERVAL '7 days'
    WHERE cache_id = cache_id;
    
    RETURN cache_id;
  ELSE
    -- Create new cache entry
    INSERT INTO recipe_cache (search_query, normalized_query, recipes, search_type)
    VALUES (search_query, normalized_query, recipes_data, search_type)
    RETURNING cache_id INTO cache_id;
    
    RETURN cache_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM recipe_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
