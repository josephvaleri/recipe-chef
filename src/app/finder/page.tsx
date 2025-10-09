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
  Globe,
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
  // CACHE BUST - v1.2.1 - Force browser to reload new search logic
  const [userRecipes, setUserRecipes] = useState<GlobalRecipe[]>([])
  const [globalRecipes, setGlobalRecipes] = useState<GlobalRecipe[]>([])
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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    proteins: true,
    vegetables: true,
    fruits: true,
    grains: true,
    dairy: true,
    spices: true
  })
  const router = useRouter()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    // Only search if at least one ingredient is selected
    const hasSelectedIngredients = [
      ...filters.proteins,
      ...filters.vegetables,
      ...filters.fruits,
      ...filters.grains,
      ...filters.dairy,
      ...filters.spices
    ].length > 0

    if (hasSelectedIngredients) {
      searchRecipes()
    } else {
      // Clear recipes when no ingredients are selected
      setUserRecipes([])
      setGlobalRecipes([])
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

      // Load ingredients by category - use pagination to get all ingredients
      let allIngredients: any[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: batchData, error } = await supabase
          .from('ingredients')
          .select(`
            *,
            category:ingredient_categories(name)
          `)
          .order('name')
          .range(from, from + batchSize - 1)

        if (error) {
          console.error('Error loading ingredients batch:', error)
          break
        }

        if (batchData && batchData.length > 0) {
          allIngredients = [...allIngredients, ...batchData]
          from += batchSize
          hasMore = batchData.length === batchSize
        } else {
          hasMore = false
        }
      }

      console.log(`Loaded ${allIngredients.length} ingredients total`)

      setCuisines(cuisinesData || [])
      setMealTypes(mealTypesData || [])
      setIngredients(allIngredients)

      // Don't load any recipes initially - wait for user to select ingredients
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }


  const parseSearchQuery = (query: string) => {
    if (!query.trim()) return

    // Extract ingredient names from natural language
    const ingredientNames = query
      .toLowerCase()
      .replace(/find a recipe that uses?/gi, '')
      .replace(/recipe that uses?/gi, '')
      .replace(/uses?/gi, '')
      .replace(/with/gi, '')
      .replace(/and/gi, ',')
      .replace(/or/gi, ',')
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0)

    console.log('Parsed ingredient names:', ingredientNames)

    // Find matching ingredients in the database (optimized)
    const matchedIngredients: { [key: string]: number[] } = {
      proteins: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      spices: []
    }

    // Use a more efficient matching approach
    ingredientNames.forEach(searchName => {
      const foundIngredients = ingredients.filter(ingredient => {
        if (!ingredient || !ingredient.name) return false
        const ingredientName = ingredient.name.toLowerCase()
        return ingredientName.includes(searchName) || searchName.includes(ingredientName)
      })

      foundIngredients.forEach(ingredient => {
        if (ingredient && ingredient.category_id && ingredient.ingredient_id) {
          const categoryKey = getCategoryKey(ingredient.category_id)
          if (categoryKey && !matchedIngredients[categoryKey].includes(ingredient.ingredient_id)) {
            matchedIngredients[categoryKey].push(ingredient.ingredient_id)
          }
        }
      })
    })

    console.log('Matched ingredients:', matchedIngredients)

    // Update filters with matched ingredients (batch update)
    setFilters(prev => {
      const newFilters = { ...prev }
      Object.keys(matchedIngredients).forEach(category => {
        const categoryKey = category as keyof typeof matchedIngredients
        ;(newFilters as any)[categoryKey] = [...(prev as any)[categoryKey], ...matchedIngredients[categoryKey]]
      })
      return newFilters
    })

    return matchedIngredients
  }

  const getCategoryKey = (categoryId: number) => {
    const categoryMap: { [key: number]: string } = {
      1: 'proteins',
      2: 'vegetables', 
      3: 'fruits',
      4: 'grains',
      7: 'dairy',
      6: 'spices'
    }
    return categoryMap[categoryId]
  }

  const searchRecipes = async () => {
    setLoading(true)
    try {
      // Check if search query contains natural language ingredient search
      if (searchQuery.trim() && searchQuery.toLowerCase().includes('recipe')) {
        console.log('Detected natural language search:', searchQuery)
        parseSearchQuery(searchQuery)
        // Clear the search query after processing
        setSearchQuery('')
      }

      // Get all selected ingredients
      const allSelectedIngredients = [
        ...filters.proteins,
        ...filters.vegetables,
        ...filters.fruits,
        ...filters.grains,
        ...filters.dairy,
        ...filters.spices
      ]

      // If no ingredients selected, clear recipes
      if (allSelectedIngredients.length === 0) {
        setUserRecipes([])
        setGlobalRecipes([])
        return
      }

      await performIngredientSearch()
    } catch (error) {
      console.error('Error searching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const performIngredientSearch = async () => {
    console.log('🚀 NEW SEARCH LOGIC EXECUTING - CACHE BUSTED v1.2.1')
    try {
      // Get all selected ingredients
      const allSelectedIngredients = [
        ...filters.proteins,
        ...filters.vegetables,
        ...filters.fruits,
        ...filters.grains,
        ...filters.dairy,
        ...filters.spices
      ]

      // If no ingredients selected, clear recipes
      if (allSelectedIngredients.length === 0) {
        setUserRecipes([])
        setGlobalRecipes([])
        return
      }

      console.log('Searching for ingredients:', allSelectedIngredients)
      console.log('Starting ingredient search...', new Date().toISOString())

      // Step 1: Find recipes that contain any of the selected ingredients
      // Search user recipes through user_recipe_ingredients_detail
      const { data: userIngredientMatches, error: userIngredientError } = await supabase
        .from('user_recipe_ingredients_detail')
        .select(`
          user_recipe_id,
          ingredient_id,
          original_text,
          matched_term
        `)
        .in('ingredient_id', allSelectedIngredients)

      if (userIngredientError) {
        console.error('Error searching user ingredient details:', userIngredientError)
      }

      // Search global recipes through global_recipe_ingredients_detail
      const { data: globalIngredientMatches, error: globalIngredientError } = await supabase
        .from('global_recipe_ingredients_detail')
        .select(`
          recipe_id,
          ingredient_id,
          original_text,
          matched_term
        `)
        .in('ingredient_id', allSelectedIngredients)

      if (globalIngredientError) {
        console.error('Error searching global ingredient details:', globalIngredientError)
      }

      console.log('User ingredient matches:', userIngredientMatches?.length || 0)
      console.log('Global ingredient matches:', globalIngredientMatches?.length || 0)
      console.log('NEW SEARCH LOGIC RUNNING - TIMESTAMP:', new Date().toISOString())

      // Step 2: Get unique recipe IDs
      const userRecipeIds = [...new Set(userIngredientMatches?.map(match => match.user_recipe_id) || [])]
      const globalRecipeIds = [...new Set(globalIngredientMatches?.map(match => match.recipe_id) || [])]

      console.log('User recipe IDs:', userRecipeIds)
      console.log('Global recipe IDs:', globalRecipeIds)

      // Step 3: Fetch full recipe data for matching recipes
      let userRecipesData: any[] = []
      let globalRecipesData: any[] = []

      // Fetch user recipes if we have matches
      if (userRecipeIds.length > 0) {
        let userQuery = supabase
          .from('user_recipes')
          .select(`
            *,
            cuisine:cuisines(name),
            meal_type:meal_types(name)
          `)
          .in('user_recipe_id', userRecipeIds)

        // Apply filters to user recipes
        if (filters.cuisine_id) {
          userQuery = userQuery.eq('cuisine_id', filters.cuisine_id)
        }
        if (filters.meal_type_id) {
          userQuery = userQuery.eq('meal_type_id', filters.meal_type_id)
        }
        if (filters.difficulty) {
          userQuery = userQuery.eq('difficulty', filters.difficulty)
        }
        if (searchQuery.trim() && !searchQuery.toLowerCase().includes('recipe')) {
          userQuery = userQuery.textSearch('title', searchQuery.trim())
        }

        const { data: userRecipes, error: userRecipesError } = await userQuery

        if (userRecipesError) {
          console.error('Error fetching user recipes:', userRecipesError)
        } else {
          userRecipesData = (userRecipes || []).map(recipe => ({ ...recipe, source: 'user' }))
        }
      }

      // Fetch global recipes if we have matches
      if (globalRecipeIds.length > 0) {
        let globalQuery = supabase
          .from('global_recipes')
          .select(`
            *,
            cuisine:cuisines(name),
            meal_type:meal_types(name)
          `)
          .in('recipe_id', globalRecipeIds)
          .eq('is_published', true)

        // Apply filters to global recipes
        if (filters.cuisine_id) {
          globalQuery = globalQuery.eq('cuisine_id', filters.cuisine_id)
        }
        if (filters.meal_type_id) {
          globalQuery = globalQuery.eq('meal_type_id', filters.meal_type_id)
        }
        if (filters.difficulty) {
          globalQuery = globalQuery.eq('difficulty', filters.difficulty)
        }
        if (searchQuery.trim() && !searchQuery.toLowerCase().includes('recipe')) {
          globalQuery = globalQuery.textSearch('title', searchQuery.trim())
        }

        const { data: globalRecipes, error: globalRecipesError } = await globalQuery

        if (globalRecipesError) {
          console.error('Error fetching global recipes:', globalRecipesError)
        } else {
          globalRecipesData = (globalRecipes || []).map(recipe => ({ ...recipe, source: 'global' }))
        }
      }

      console.log('Fetched user recipes:', userRecipesData.length)
      console.log('Fetched global recipes:', globalRecipesData.length)

      // Step 4: Count ingredient matches for each recipe
      const scoredUserRecipes = userRecipesData.map(recipe => {
        // Count how many of the selected ingredients this recipe contains
        const recipeMatches = userIngredientMatches?.filter(match => 
          match.user_recipe_id === recipe.user_recipe_id && 
          allSelectedIngredients.includes(match.ingredient_id)
        ) || []

        const ingredientMatches = recipeMatches.length
        const matchPercentage = allSelectedIngredients.length > 0 
          ? (ingredientMatches / allSelectedIngredients.length) * 100 
          : 0

        // Bonus points for exact matches
        let bonusScore = 0
        if (filters.cuisine_id && recipe.cuisine_id === filters.cuisine_id) {
          bonusScore += 10
        }
        if (filters.meal_type_id && recipe.meal_type_id === filters.meal_type_id) {
          bonusScore += 10
        }
        if (filters.difficulty && recipe.difficulty === filters.difficulty) {
          bonusScore += 5
        }

        return {
          ...recipe,
          ingredientMatches,
          matchPercentage,
          totalScore: matchPercentage + bonusScore,
          matchedIngredients: recipeMatches
        }
      })

      const scoredGlobalRecipes = globalRecipesData.map(recipe => {
        // Count how many of the selected ingredients this recipe contains
        const recipeMatches = globalIngredientMatches?.filter(match => 
          match.recipe_id === recipe.recipe_id && 
          allSelectedIngredients.includes(match.ingredient_id)
        ) || []

        const ingredientMatches = recipeMatches.length
        const matchPercentage = allSelectedIngredients.length > 0 
          ? (ingredientMatches / allSelectedIngredients.length) * 100 
          : 0

        // Bonus points for exact matches
        let bonusScore = 0
        if (filters.cuisine_id && recipe.cuisine_id === filters.cuisine_id) {
          bonusScore += 10
        }
        if (filters.meal_type_id && recipe.meal_type_id === filters.meal_type_id) {
          bonusScore += 10
        }
        if (filters.difficulty && recipe.difficulty === filters.difficulty) {
          bonusScore += 5
        }

        return {
          ...recipe,
          ingredientMatches,
          matchPercentage,
          totalScore: matchPercentage + bonusScore,
          matchedIngredients: recipeMatches
        }
      })

      // Sort by total score (ingredient matches + bonus points)
      scoredUserRecipes.sort((a, b) => b.totalScore - a.totalScore)
      scoredGlobalRecipes.sort((a, b) => b.totalScore - a.totalScore)

      console.log('Final user recipes:', scoredUserRecipes.length)
      console.log('Final global recipes:', scoredGlobalRecipes.length)

      setUserRecipes(scoredUserRecipes)
      setGlobalRecipes(scoredGlobalRecipes)
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

      const recipe = [...userRecipes, ...globalRecipes].find(r => r.recipe_id === recipeId)
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
          cuisine_id: (recipe as any).cuisine_id,
          meal_type_id: (recipe as any).meal_type_id,
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
        const ingredients = recipe.ingredients.map((ing: any) => ({
          user_recipe_id: userRecipe.user_recipe_id,
          ingredient_id: ing.ingredient?.ingredient_id || ing.ingredient_id,
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
      setGlobalRecipes(prev => prev.map(r => 
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
    // Clear recipes instead of loading popular ones
    setUserRecipes([])
    setGlobalRecipes([])
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  const getIngredientsByCategory = (categoryId: number) => {
    return ingredients.filter(ing => ing && ing.category_id === categoryId)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
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
            
            {/* Search Criteria - Top Right */}
            <div className="flex items-center space-x-4">
              {/* Quick Search */}
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Button onClick={searchRecipes} disabled={loading} size="sm">
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              
              {/* Basic Filters */}
              <div className="flex items-center space-x-2">
                <select
                  value={filters.cuisine_id || ''}
                  onChange={(e) => handleFilterChange('cuisine_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Any Cuisine</option>
                  {cuisines.map(cuisine => (
                    <option key={cuisine.cuisine_id} value={cuisine.cuisine_id}>
                      {cuisine.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.meal_type_id || ''}
                  onChange={(e) => handleFilterChange('meal_type_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Any Meal</option>
                  {mealTypes.map(mealType => (
                    <option key={mealType.meal_type_id} value={mealType.meal_type_id}>
                      {mealType.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.difficulty || ''}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value || undefined)}
                  className="border rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Any Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Very Hard">Very Hard</option>
                </select>
                
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Chef Tony Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ChefOuiOui />
            </div>
          </div>

          {/* Ingredient Selection */}
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Select Ingredients</span>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Proteins */}
                    <div>
                      <button
                        onClick={() => toggleCategory('proteins')}
                        className="flex items-center justify-between w-full text-left font-medium text-sm text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <span>Proteins ({getIngredientsByCategory(1).length})</span>
                        <span className="text-xs">
                          {expandedCategories.proteins ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.proteins && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
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
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vegetables */}
                    <div>
                      <button
                        onClick={() => toggleCategory('vegetables')}
                        className="flex items-center justify-between w-full text-left font-medium text-sm text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <span>Vegetables ({getIngredientsByCategory(2).length})</span>
                        <span className="text-xs">
                          {expandedCategories.vegetables ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.vegetables && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
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
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fruits */}
                    <div>
                      <button
                        onClick={() => toggleCategory('fruits')}
                        className="flex items-center justify-between w-full text-left font-medium text-sm text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <span>Fruits ({getIngredientsByCategory(3).length})</span>
                        <span className="text-xs">
                          {expandedCategories.fruits ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.fruits && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(3).map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.fruits.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newFruits = e.target.checked
                                    ? [...filters.fruits, ingredient.ingredient_id]
                                    : filters.fruits.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('fruits', newFruits)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Grains */}
                    <div>
                      <button
                        onClick={() => toggleCategory('grains')}
                        className="flex items-center justify-between w-full text-left font-medium text-sm text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <span>Grains ({getIngredientsByCategory(4).length})</span>
                        <span className="text-xs">
                          {expandedCategories.grains ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.grains && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(4).map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.grains.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newGrains = e.target.checked
                                    ? [...filters.grains, ingredient.ingredient_id]
                                    : filters.grains.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('grains', newGrains)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dairy */}
                    <div>
                      <button
                        onClick={() => toggleCategory('dairy')}
                        className="flex items-center justify-between w-full text-left font-medium text-sm text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <span>Dairy ({getIngredientsByCategory(7).length})</span>
                        <span className="text-xs">
                          {expandedCategories.dairy ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.dairy && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(7).map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.dairy.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newDairy = e.target.checked
                                    ? [...filters.dairy, ingredient.ingredient_id]
                                    : filters.dairy.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('dairy', newDairy)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Spices */}
                    <div>
                      <button
                        onClick={() => toggleCategory('spices')}
                        className="flex items-center justify-between w-full text-left font-medium text-sm text-gray-700 mb-2 hover:text-gray-900"
                      >
                        <span>Spices ({getIngredientsByCategory(6).length})</span>
                        <span className="text-xs">
                          {expandedCategories.spices ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.spices && (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {getIngredientsByCategory(6).map(ingredient => (
                            <label key={ingredient.ingredient_id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={filters.spices.includes(ingredient.ingredient_id)}
                                onChange={(e) => {
                                  const newSpices = e.target.checked
                                    ? [...filters.spices, ingredient.ingredient_id]
                                    : filters.spices.filter(id => id !== ingredient.ingredient_id)
                                  handleFilterChange('spices', newSpices)
                                }}
                                className="rounded"
                              />
                              <span className="text-xs">{ingredient.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {loading ? 'Searching...' : `${userRecipes.length + globalRecipes.length} Recipes Found`}
              </h2>
              <p className="text-gray-600">
                Discover amazing recipes from your cookbook and our global collection
              </p>
            </div>

            {/* My Cookbook Section - Top Right */}
            {userRecipes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ChefHat className="w-5 h-5 mr-2 text-orange-600" />
                  My Cookbook ({userRecipes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userRecipes.map((recipe) => (
                    <RecipeCard
                      key={`user-${recipe.user_recipe_id || recipe.recipe_id}`}
                      recipe={recipe as any}
                      onAddToCookbook={addToCookbook}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Global Recipes Section - Bottom Right */}
            {globalRecipes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Global Recipes ({globalRecipes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {globalRecipes.map((recipe) => (
                    <RecipeCard
                      key={`global-${recipe.recipe_id}`}
                      recipe={recipe as any}
                      onAddToCookbook={addToCookbook}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {userRecipes.length === 0 && globalRecipes.length === 0 && !loading && (
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
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
