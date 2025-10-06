'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { ChefOuiOui } from '@/components/chef-ouioui'
import RecipeCard from '@/components/recipe-card'
import { 
  ChefHat, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  Users, 
  Star, 
  ArrowLeft,
  ChefHat as DifficultyIcon
} from 'lucide-react'

interface GlobalRecipe {
  recipe_id: number
  title: string
  description?: string
  image_url?: string
  prep_time?: string
  cook_time?: string
  total_time?: string
  servings?: string
  difficulty?: string
  added_count: number
  cuisine?: { name: string }
  meal_type?: { name: string }
  ingredients: Array<{
    ingredient: { name: string; category_id: number }
    amount?: string
    unit?: string
  }>
  rating?: number
  score?: number
}

interface FilterState {
  cuisine_id?: number
  meal_type_id?: number
  proteins: number[]
  vegetables: number[]
  fruits: number[]
  grains: number[]
  dairy: number[]
  spices: number[]
  difficulty?: string
}

export default function RecipeFinderPage() {
  const [recipes, setRecipes] = useState<GlobalRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    proteins: [],
    vegetables: [],
    fruits: [],
    grains: [],
    dairy: [],
    spices: []
  })
  const [cuisines, setCuisines] = useState<any[]>([])
  const [mealTypes, setMealTypes] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      searchRecipes()
    }
  }, [filters])

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const profileData = await getCurrentProfile()
      setProfile(profileData)

      // Load cuisines
      const { data: cuisinesData } = await supabase
        .from('cuisines')
        .select('*')
        .order('name')

      // Load meal types
      const { data: mealTypesData } = await supabase
        .from('meal_types')
        .select('*')
        .order('name')

      // Load ingredients by category
      const { data: ingredientsData } = await supabase
        .from('ingredients')
        .select(`
          *,
          category:ingredient_categories(name)
        `)
        .order('name')

      setCuisines(cuisinesData || [])
      setMealTypes(mealTypesData || [])
      setIngredients(ingredientsData || [])

      // Load initial popular recipes
      loadPopularRecipes()
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadPopularRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('global_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name),
          ingredients:global_recipe_ingredients(
            ingredient:ingredients(name, category_id),
            amount,
            unit
          )
        `)
        .eq('is_published', true)
        .order('added_count', { ascending: false })
        .limit(12)

      if (error) {
        console.error('Error loading popular recipes:', error)
        return
      }

      setRecipes(data || [])
    } catch (error) {
      console.error('Error loading popular recipes:', error)
    }
  }

  const searchRecipes = async () => {
    setLoading(true)
    try {
      // Build the search query
      let query = supabase
        .from('global_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name),
          ingredients:global_recipe_ingredients(
            ingredient:ingredients(name, category_id),
            amount,
            unit
          )
        `)
        .eq('is_published', true)

      // Apply filters
      if (filters.cuisine_id) {
        query = query.eq('cuisine_id', filters.cuisine_id)
      }

      if (filters.meal_type_id) {
        query = query.eq('meal_type_id', filters.meal_type_id)
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty)
      }

      // Apply text search
      if (searchQuery.trim()) {
        query = query.textSearch('title', searchQuery.trim())
      }

      const { data, error } = await query.limit(50)

      if (error) {
        console.error('Error searching recipes:', error)
        return
      }

      // Score and filter recipes based on ingredient matches
      const scoredRecipes = (data || []).map(recipe => {
        let score = 0
        const maxScore = 10

        // Must match cuisine and meal type
        if (filters.cuisine_id && recipe.cuisine_id === filters.cuisine_id) {
          score += 3
        }
        if (filters.meal_type_id && recipe.meal_type_id === filters.meal_type_id) {
          score += 3
        }

        // Check for protein match (required)
        if (filters.proteins.length > 0) {
          const hasProtein = recipe.ingredients?.some(ing => 
            filters.proteins.includes(ing.ingredient.category_id)
          )
          if (hasProtein) {
            score += 2
          } else {
            return { ...recipe, score: 0 } // Must have matching protein
          }
        }

        // Score ingredient matches
        const allSelectedIngredients = [
          ...filters.proteins,
          ...filters.vegetables,
          ...filters.fruits,
          ...filters.grains,
          ...filters.dairy,
          ...filters.spices
        ]

        if (allSelectedIngredients.length > 0) {
          const matchingIngredients = recipe.ingredients?.filter(ing =>
            allSelectedIngredients.includes(ing.ingredient.category_id)
          ).length || 0

          score += Math.min(matchingIngredients, 2)
        }

        return { ...recipe, score: score / maxScore }
      }).filter(recipe => recipe.score >= 0.5) // Minimum threshold

      // Sort by score
      scoredRecipes.sort((a, b) => b.score - a.score)

      setRecipes(scoredRecipes)
    } catch (error) {
      console.error('Error searching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCookbook = async (recipeId: number) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const recipe = recipes.find(r => r.recipe_id === recipeId)
      if (!recipe) return

      // Create user recipe from global recipe
      const { data: userRecipe, error: recipeError } = await supabase
        .from('user_recipes')
        .insert({
          user_id: user.id,
          recipe_id: recipeId, // Reference to global recipe
          title: recipe.title,
          description: recipe.description,
          image_url: recipe.image_url,
          cuisine_id: recipe.cuisine_id,
          meal_type_id: recipe.meal_type_id,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          total_time: recipe.total_time,
          source_name: 'Global Cookbook',
          source_url: `/finder`
        })
        .select()
        .single()

      if (recipeError) {
        console.error('Error adding recipe:', recipeError)
        return
      }

      // Copy ingredients
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const ingredients = recipe.ingredients.map(ing => ({
          user_recipe_id: userRecipe.user_recipe_id,
          ingredient_id: ing.ingredient.ingredient_id,
          amount: ing.amount,
          unit: ing.unit
        }))

        await supabase
          .from('user_recipe_ingredients')
          .insert(ingredients)
      }

      // Copy steps
      const { data: stepsData } = await supabase
        .from('global_recipe_steps')
        .select('step_number, text')
        .eq('recipe_id', recipeId)
        .order('step_number')

      if (stepsData && stepsData.length > 0) {
        const steps = stepsData.map(step => ({
          user_recipe_id: userRecipe.user_recipe_id,
          step_number: step.step_number,
          text: step.text
        }))

        await supabase
          .from('user_recipe_steps')
          .insert(steps)
      }

      // Update the added count in the UI
      setRecipes(prev => prev.map(r => 
        r.recipe_id === recipeId 
          ? { ...r, added_count: r.added_count + 1 }
          : r
      ))

      // Show success message (you could add a toast here)
      alert('Recipe added to your cookbook!')
    } catch (error) {
      console.error('Error adding recipe:', error)
    }
  }

  const handleFilterChange = (category: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [category]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      proteins: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      spices: []
    })
    setSearchQuery('')
    loadPopularRecipes()
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  const getIngredientsByCategory = (categoryId: number) => {
    return ingredients.filter(ing => ing.category_id === categoryId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Recipe Finder</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Chef OuiOui */}
              <ChefOuiOui />

              {/* Search */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="w-5 h-5 text-orange-500" />
                    <span>Search</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button onClick={searchRecipes} className="w-full" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Filter className="w-5 h-5 text-orange-500" />
                      <span>Filters</span>
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cuisine */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cuisine</label>
                    <select
                      value={filters.cuisine_id || ''}
                      onChange={(e) => handleFilterChange('cuisine_id', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Any Cuisine</option>
                      {cuisines.map(cuisine => (
                        <option key={cuisine.cuisine_id} value={cuisine.cuisine_id}>
                          {cuisine.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Meal Type */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Meal Type</label>
                    <select
                      value={filters.meal_type_id || ''}
                      onChange={(e) => handleFilterChange('meal_type_id', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Any Meal</option>
                      {mealTypes.map(mealType => (
                        <option key={mealType.meal_type_id} value={mealType.meal_type_id}>
                          {mealType.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Difficulty</label>
                    <select
                      value={filters.difficulty || ''}
                      onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Any Difficulty</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Very Hard">Very Hard</option>
                    </select>
                  </div>

                  {/* Proteins */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Proteins</label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {getIngredientsByCategory(1).map(ingredient => (
                        <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={filters.proteins.includes(ingredient.ingredient_id)}
                            onChange={(e) => {
                              const newProteins = e.target.checked
                                ? [...filters.proteins, ingredient.ingredient_id]
                                : filters.proteins.filter(id => id !== ingredient.ingredient_id)
                              handleFilterChange('proteins', newProteins)
                            }}
                            className="rounded"
                          />
                          <span>{ingredient.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Vegetables */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Vegetables</label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {getIngredientsByCategory(2).map(ingredient => (
                        <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={filters.vegetables.includes(ingredient.ingredient_id)}
                            onChange={(e) => {
                              const newVegetables = e.target.checked
                                ? [...filters.vegetables, ingredient.ingredient_id]
                                : filters.vegetables.filter(id => id !== ingredient.ingredient_id)
                              handleFilterChange('vegetables', newVegetables)
                            }}
                            className="rounded"
                          />
                          <span>{ingredient.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {loading ? 'Searching...' : `${recipes.length} Recipes Found`}
              </h2>
              <p className="text-gray-600">
                Discover amazing recipes from our global cookbook
              </p>
            </div>

            {recipes.length === 0 && !loading ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No recipes found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.recipe_id}
                    recipe={recipe}
                    onAddToCookbook={addToCookbook}
                    showIngredientDetails={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
