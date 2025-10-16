import { supabase } from './supabase'

// Query optimization utilities
export class QueryOptimizer {
  // Cache for frequently accessed data
  private static cache = new Map<string, { data: any; timestamp: number }>()
  private static CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Optimized recipe query with minimal data fetching
  static async getRecipesOptimized(filters: {
    userId?: string
    limit?: number
    offset?: number
    search?: string
  } = {}) {
    const cacheKey = `recipes_${JSON.stringify(filters)}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    const query = supabase
      .from('user_recipes')
      .select(`
        user_recipe_id,
        title,
        image_url,
        prep_time,
        cook_time,
        difficulty,
        rating,
        created_at,
        cuisine:cuisines(name),
        meal_type:meal_types(name)
      `)
      .order('created_at', { ascending: false })

    if (filters.userId) {
      query.eq('user_id', filters.userId)
    }

    if (filters.search) {
      query.ilike('title', `%${filters.search}%`)
    }

    if (filters.limit) {
      query.limit(filters.limit)
    }

    if (filters.offset) {
      query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    this.setCache(cacheKey, data)
    return data
  }

  // Optimized ingredient search with pagination
  static async searchIngredientsOptimized(query: string, limit = 20) {
    const cacheKey = `ingredients_${query}_${limit}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('ingredients')
      .select('ingredient_id, name, category_id, category:ingredient_categories(name)')
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (error) throw error

    this.setCache(cacheKey, data)
    return data
  }

  // Batch load recipe details only when needed
  static async getRecipeDetails(recipeId: string) {
    const cacheKey = `recipe_details_${recipeId}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    const [recipeResult, ingredientsResult, stepsResult] = await Promise.all([
      supabase
        .from('user_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .eq('user_recipe_id', recipeId)
        .single(),
      
      supabase
        .from('user_recipe_ingredients')
        .select(`
          amount,
          unit,
          raw_name,
          ingredient:ingredients(name, category:ingredient_categories(name))
        `)
        .eq('user_recipe_id', recipeId),
      
      supabase
        .from('user_recipe_steps')
        .select('step_number, text')
        .eq('user_recipe_id', recipeId)
        .order('step_number')
    ])

    if (recipeResult.error) throw recipeResult.error

    const recipe = {
      ...recipeResult.data,
      ingredients: ingredientsResult.data || [],
      steps: stepsResult.data || []
    }

    this.setCache(cacheKey, recipe)
    return recipe
  }

  // Optimized global recipes query
  static async getGlobalRecipesOptimized(filters: {
    limit?: number
    offset?: number
    search?: string
    cuisine?: string
    mealType?: string
  } = {}) {
    const cacheKey = `global_recipes_${JSON.stringify(filters)}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    const query = supabase
      .from('global_recipes')
      .select(`
        global_recipe_id,
        title,
        image_url,
        prep_time,
        cook_time,
        difficulty,
        rating,
        cuisine:cuisines(name),
        meal_type:meal_types(name)
      `)
      .eq('is_active', true)
      .order('rating', { ascending: false })

    if (filters.search) {
      query.ilike('title', `%${filters.search}%`)
    }

    if (filters.cuisine) {
      query.eq('cuisine_id', filters.cuisine)
    }

    if (filters.mealType) {
      query.eq('meal_type_id', filters.mealType)
    }

    if (filters.limit) {
      query.limit(filters.limit)
    }

    if (filters.offset) {
      query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    this.setCache(cacheKey, data)
    return data
  }

  // Cache management
  private static getCached(key: string) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private static setCache(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Clear cache when data is modified
  static clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}
