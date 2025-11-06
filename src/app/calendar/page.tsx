'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { ChefOuiOui } from '@/components/chef-ouioui'
import BackgroundWrapper from '@/components/layout/background-wrapper'
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
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false)
  const [addRecipeDate, setAddRecipeDate] = useState<Date | null>(null)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
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
          user_recipe_id,
          global_recipe_id,
          user_recipes(user_recipe_id, title, total_time, servings, image_url),
          global_recipes(recipe_id, title, total_time, servings, image_url)
        `)
        .eq('user_id', user.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])

      if (error) {
        console.error('Error loading meal plans:', error)
        return
      }

      // Transform data: Rename fields to match our interface
      const transformedData = (data || []).map((plan: any) => ({
        ...plan,
        user_recipe: plan.user_recipes || undefined,
        global_recipe: plan.global_recipes || undefined
      }))

      setMealPlans(transformedData)
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

  const generateShoppingList = (days: number) => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    // Navigate to shopping list page with pre-filled parameters
    router.push(`/shopping-list?start=${startDate}&days=${days}&people=4`);
  };

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

  const openAddRecipeModal = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent day selection
    setAddRecipeDate(date)
    setRecipeSearchQuery('')
    setShowAddRecipeModal(true)
  }

  const closeAddRecipeModal = () => {
    setShowAddRecipeModal(false)
    setAddRecipeDate(null)
    setRecipeSearchQuery('')
  }

  const addRecipeFromModal = async (recipeId: number, isGlobal: boolean) => {
    if (!addRecipeDate) return
    await addMealToDate(addRecipeDate, recipeId, isGlobal)
    closeAddRecipeModal()
  }

  // Filter recipes based on search query
  const filteredUserRecipes = userRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  )
  
  const filteredGlobalRecipes = globalRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  )

  return (
    <BackgroundWrapper backgroundImage="/background_14.png">
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
                        className={`h-24 border border-gray-200 p-1 hover:bg-orange-50 ${
                          isCurrentDay ? 'bg-orange-100' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div 
                            className={`text-sm font-medium cursor-pointer ${isCurrentDay ? 'text-orange-600' : ''}`}
                            onClick={() => setSelectedDate(date)}
                          >
                            {index + 1}
                          </div>
                          <button
                            onClick={(e) => openAddRecipeModal(date, e)}
                            className="text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded-full w-5 h-5 flex items-center justify-center text-lg font-bold transition-colors"
                            title="Add recipe to this day"
                          >
                            +
                          </button>
                        </div>
                        <div className="space-y-1" onClick={() => setSelectedDate(date)}>
                          {meals.map(meal => {
                            const recipeId = meal.user_recipe?.user_recipe_id || meal.global_recipe?.recipe_id
                            const isGlobal = !!meal.global_recipe
                            const recipeUrl = isGlobal 
                              ? `/recipe/global/${recipeId}` 
                              : `/recipe/${recipeId}`
                            const title = meal.user_recipe?.title || meal.global_recipe?.title
                            
                            return (
                              <div
                                key={meal.id}
                                onClick={(e) => {
                                  e.stopPropagation() // Prevent triggering day selection
                                  router.push(recipeUrl)
                                }}
                                className="text-xs bg-orange-200 text-orange-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-orange-300 transition-colors"
                                title={title}
                              >
                                {title}
                              </div>
                            )
                          })}
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
                    {getMealsForDate(selectedDate).map(meal => {
                      const recipeId = meal.user_recipe?.user_recipe_id || meal.global_recipe?.recipe_id
                      const isGlobal = !!meal.global_recipe
                      const recipeUrl = isGlobal 
                        ? `/recipe/global/${recipeId}` 
                        : `/recipe/${recipeId}`
                      
                      return (
                        <div key={meal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div 
                            className="flex items-center space-x-3 flex-1 cursor-pointer"
                            onClick={() => router.push(recipeUrl)}
                          >
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
                              <h4 className="font-medium text-orange-600 hover:text-orange-700">
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
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMeal(meal.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}

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
            {/* Chef Tony */}
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

      {/* Add Recipe Modal */}
      {showAddRecipeModal && addRecipeDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Add Recipe to {addRecipeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h2>
                <button
                  onClick={closeAddRecipeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Search Box */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={recipeSearchQuery}
                  onChange={(e) => setRecipeSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10"
                  autoFocus
                />
                {recipeSearchQuery && (
                  <button
                    onClick={() => setRecipeSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Recipe List */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* User Recipes */}
              {filteredUserRecipes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">My Recipes ({filteredUserRecipes.length})</h3>
                  <div className="space-y-2">
                    {filteredUserRecipes.map(recipe => (
                      <div
                        key={recipe.user_recipe_id}
                        onClick={() => addRecipeFromModal(recipe.user_recipe_id, false)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {recipe.image_url ? (
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-orange-200 rounded flex items-center justify-center flex-shrink-0">
                              <ChefHat className="w-6 h-6 text-orange-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{recipe.title}</p>
                            {(recipe.total_time || recipe.servings) && (
                              <div className="flex items-center space-x-3 text-sm text-gray-500">
                                {recipe.total_time && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatTime(recipe.total_time)}
                                  </div>
                                )}
                                {recipe.servings && (
                                  <div className="flex items-center">
                                    <Users className="w-3 h-3 mr-1" />
                                    {recipe.servings}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-orange-500 group-hover:text-orange-700 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Global Recipes */}
              {filteredGlobalRecipes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Popular Recipes ({filteredGlobalRecipes.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredGlobalRecipes.slice(0, 20).map(recipe => (
                      <div
                        key={recipe.recipe_id}
                        onClick={() => addRecipeFromModal(recipe.recipe_id, true)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {recipe.image_url ? (
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-orange-200 rounded flex items-center justify-center flex-shrink-0">
                              <ChefHat className="w-6 h-6 text-orange-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{recipe.title}</p>
                            {(recipe.total_time || recipe.servings) && (
                              <div className="flex items-center space-x-3 text-sm text-gray-500">
                                {recipe.total_time && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatTime(recipe.total_time)}
                                  </div>
                                )}
                                {recipe.servings && (
                                  <div className="flex items-center">
                                    <Users className="w-3 h-3 mr-1" />
                                    {recipe.servings}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-orange-500 group-hover:text-orange-700 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {filteredUserRecipes.length === 0 && filteredGlobalRecipes.length === 0 && (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">
                    {recipeSearchQuery 
                      ? `No recipes found matching "${recipeSearchQuery}"`
                      : 'No recipes available'}
                  </p>
                  {recipeSearchQuery && (
                    <button
                      onClick={() => setRecipeSearchQuery('')}
                      className="mt-4 text-orange-600 hover:text-orange-700"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={closeAddRecipeModal}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </BackgroundWrapper>
  )
}
