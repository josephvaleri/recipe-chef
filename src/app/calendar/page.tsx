'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { 
  ChefHat, 
  Calendar, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  ArrowLeft,
  ArrowRight,
  Clock,
  Users
} from 'lucide-react'

interface MealPlan {
  id: number
  date: string
  user_recipe?: {
    user_recipe_id: number
    title: string
    total_time?: string
    servings?: string
    image_url?: string
  }
  global_recipe?: {
    recipe_id: number
    title: string
    total_time?: string
    servings?: string
    image_url?: string
  }
}

interface UserRecipe {
  user_recipe_id: number
  title: string
  total_time?: string
  servings?: string
  image_url?: string
}

interface GlobalRecipe {
  recipe_id: number
  title: string
  total_time?: string
  servings?: string
  image_url?: string
}

interface ShoppingList {
  id: number
  from_date: string
  to_date: string
  items: any
  created_at: string
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([])
  const [globalRecipes, setGlobalRecipes] = useState<GlobalRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const router = useRouter()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadMealPlans()
  }, [currentDate])

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Load user recipes
      const { data: userRecipesData } = await supabase
        .from('user_recipes')
        .select('user_recipe_id, title, total_time, servings, image_url')
        .eq('user_id', user.id)
        .order('title')

      // Load global recipes
      const { data: globalRecipesData } = await supabase
        .from('global_recipes')
        .select('recipe_id, title, total_time, servings, image_url')
        .eq('is_published', true)
        .order('title')
        .limit(50)

      // Load shopping lists
      const { data: shoppingListsData } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setUserRecipes(userRecipesData || [])
      setGlobalRecipes(globalRecipesData || [])
      setShoppingLists(shoppingListsData || [])
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadMealPlans = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('meal_plan')
        .select(`
          id,
          date,
          user_recipe:user_recipes(user_recipe_id, title, total_time, servings, image_url),
          global_recipe:global_recipes(recipe_id, title, total_time, servings, image_url)
        `)
        .eq('user_id', user.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])

      if (error) {
        console.error('Error loading meal plans:', error)
        return
      }

      setMealPlans(data || [])
    } catch (error) {
      console.error('Error loading meal plans:', error)
    }
  }

  const addMealToDate = async (date: Date, recipeId: number, isGlobal: boolean) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const dateStr = date.toISOString().split('T')[0]

      const { error } = await supabase
        .from('meal_plan')
        .insert({
          user_id: user.id,
          date: dateStr,
          [isGlobal ? 'global_recipe_id' : 'user_recipe_id']: recipeId
        })

      if (error) {
        console.error('Error adding meal:', error)
        return
      }

      loadMealPlans()
    } catch (error) {
      console.error('Error adding meal:', error)
    }
  }

  const removeMeal = async (mealPlanId: number) => {
    try {
      const { error } = await supabase
        .from('meal_plan')
        .delete()
        .eq('id', mealPlanId)

      if (error) {
        console.error('Error removing meal:', error)
        return
      }

      loadMealPlans()
    } catch (error) {
      console.error('Error removing meal:', error)
    }
  }

  const generateShoppingList = async (days: number) => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user) return

      const fromDate = new Date()
      const toDate = new Date()
      toDate.setDate(toDate.getDate() + days)

      // Get all meal plans in the date range
      const { data: mealPlansData, error: mealPlansError } = await supabase
        .from('meal_plan')
        .select(`
          user_recipe:user_recipes(user_recipe_id),
          global_recipe:global_recipes(recipe_id)
        `)
        .eq('user_id', user.id)
        .gte('date', fromDate.toISOString().split('T')[0])
        .lte('date', toDate.toISOString().split('T')[0])

      if (mealPlansError) {
        console.error('Error loading meal plans:', mealPlansError)
        return
      }

      const recipeIds = mealPlansData
        ?.map(plan => plan.user_recipe?.user_recipe_id || plan.global_recipe?.recipe_id)
        .filter(Boolean) || []

      if (recipeIds.length === 0) {
        alert('No meals planned in the selected period')
        return
      }

      // Get ingredients for all recipes
      const { data: userIngredients } = await supabase
        .from('user_recipe_ingredients')
        .select(`
          amount,
          unit,
          raw_name,
          ingredient:ingredients(name, category:ingredient_categories(name))
        `)
        .in('user_recipe_id', recipeIds.filter((_, i) => mealPlansData?.[i]?.user_recipe))

      const { data: globalIngredients } = await supabase
        .from('global_recipe_ingredients')
        .select(`
          amount,
          unit,
          ingredient:ingredients(name, category:ingredient_categories(name))
        `)
        .in('recipe_id', recipeIds.filter((_, i) => mealPlansData?.[i]?.global_recipe))

      // Combine and group ingredients
      const allIngredients = [
        ...(userIngredients || []).map(ing => ({
          ...ing,
          name: ing.raw_name || ing.ingredient?.name || '',
          category: ing.ingredient?.category?.name || 'Other'
        })),
        ...(globalIngredients || []).map(ing => ({
          ...ing,
          name: ing.ingredient?.name || '',
          category: ing.ingredient?.category?.name || 'Other'
        }))
      ]

      // Group by category
      const groupedIngredients = allIngredients.reduce((acc, ingredient) => {
        const category = ingredient.category
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit
        })
        return acc
      }, {} as Record<string, any[]>)

      // Save shopping list
      const { data: shoppingList, error: saveError } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: user.id,
          from_date: fromDate.toISOString().split('T')[0],
          to_date: toDate.toISOString().split('T')[0],
          items: groupedIngredients
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving shopping list:', saveError)
        return
      }

      setShoppingLists(prev => [shoppingList, ...prev])
      alert(`Shopping list generated for ${days} days!`)
    } catch (error) {
      console.error('Error generating shopping list:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getMealsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return mealPlans.filter(plan => plan.date === dateStr)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
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
              <h1 className="text-xl font-bold text-gray-900">Menu Calendar</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => generateShoppingList(7)}
                disabled={loading}
                variant="outline"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping List (7 days)
              </Button>
              <Button 
                onClick={() => generateShoppingList(14)}
                disabled={loading}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping List (14 days)
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <span>
                      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, index) => (
                    <div key={`empty-${index}`} className="h-24 border border-gray-200"></div>
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: getDaysInMonth(currentDate) }, (_, index) => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), index + 1)
                    const meals = getMealsForDate(date)
                    const isCurrentDay = isToday(date)

                    return (
                      <div
                        key={index + 1}
                        className={`h-24 border border-gray-200 p-1 cursor-pointer hover:bg-orange-50 ${
                          isCurrentDay ? 'bg-orange-100' : ''
                        }`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-orange-600' : ''}`}>
                          {index + 1}
                        </div>
                        <div className="space-y-1">
                          {meals.map(meal => (
                            <div
                              key={meal.id}
                              className="text-xs bg-orange-200 text-orange-800 px-1 py-0.5 rounded truncate"
                            >
                              {meal.user_recipe?.title || meal.global_recipe?.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            {selectedDate && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getMealsForDate(selectedDate).map(meal => (
                      <div key={meal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {meal.user_recipe?.image_url || meal.global_recipe?.image_url ? (
                            <img
                              src={meal.user_recipe?.image_url || meal.global_recipe?.image_url}
                              alt={meal.user_recipe?.title || meal.global_recipe?.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-orange-200 rounded flex items-center justify-center">
                              <ChefHat className="w-6 h-6 text-orange-600" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium">
                              {meal.user_recipe?.title || meal.global_recipe?.title}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {(meal.user_recipe?.total_time || meal.global_recipe?.total_time) && (
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(meal.user_recipe?.total_time || meal.global_recipe?.total_time)}
                                </div>
                              )}
                              {(meal.user_recipe?.servings || meal.global_recipe?.servings) && (
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {meal.user_recipe?.servings || meal.global_recipe?.servings}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMeal(meal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {getMealsForDate(selectedDate).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No meals planned for this day</p>
                        <p className="text-sm">Select recipes from the sidebar to add meals</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Chef OuiOui */}
            <ChefOuiOui />

            {/* Recipe Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Add Recipe</CardTitle>
                <CardDescription>
                  {selectedDate ? `Add to ${selectedDate.toLocaleDateString()}` : 'Select a date first'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDate ? (
                  <>
                    {/* User Recipes */}
                    {userRecipes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">My Recipes</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {userRecipes.map(recipe => (
                            <div
                              key={recipe.user_recipe_id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                              onClick={() => addMealToDate(selectedDate, recipe.user_recipe_id, false)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{recipe.title}</p>
                                {recipe.total_time && (
                                  <p className="text-xs text-gray-500">
                                    {formatTime(recipe.total_time)}
                                  </p>
                                )}
                              </div>
                              <Plus className="w-4 h-4 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Global Recipes */}
                    {globalRecipes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Popular Recipes</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {globalRecipes.slice(0, 10).map(recipe => (
                            <div
                              key={recipe.recipe_id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                              onClick={() => addMealToDate(selectedDate, recipe.recipe_id, true)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{recipe.title}</p>
                                {recipe.total_time && (
                                  <p className="text-xs text-gray-500">
                                    {formatTime(recipe.total_time)}
                                  </p>
                                )}
                              </div>
                              <Plus className="w-4 h-4 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Click on a date to add meals</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Shopping Lists */}
            {shoppingLists.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shopping Lists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {shoppingLists.slice(0, 3).map(list => (
                      <div key={list.id} className="p-2 bg-gray-50 rounded text-sm">
                        <p className="font-medium">
                          {new Date(list.from_date).toLocaleDateString()} - {new Date(list.to_date).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500">
                          {Object.keys(list.items).length} categories
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
