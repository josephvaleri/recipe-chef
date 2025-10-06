'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import RecipeCard from '@/components/recipe-card'
// import { offlineStorage, networkManager, syncManager } from '@/lib/offline'
import { Search, Plus, Star, Clock, Users, ChefHat, Wifi, WifiOff, X, Loader2, Grid3X3, List, Edit } from 'lucide-react'

interface UserRecipe {
  user_recipe_id: number
  title: string
  description?: string
  image_url?: string
  prep_time?: string
  cook_time?: string
  total_time?: string
  servings?: string
  difficulty?: string
  cuisine?: { name: string }
  meal_type?: { name: string }
  is_favorite: boolean
  created_at: string
  rating?: number
  ingredients?: Array<{
    amount?: string
    unit?: string
    raw_name?: string
    ingredient?: { name: string; category_id: number }
  }>
}

export default function MyCookbookPage() {
  const [recipes, setRecipes] = useState<UserRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRecipes, setFilteredRecipes] = useState<UserRecipe[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'rating' | 'cuisine'>('date')
  const [isOnline, setIsOnline] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const router = useRouter()

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    filterRecipes()
  }, [recipes, searchQuery, sortBy])

  const loadRecipes = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Try online first
      if (isOnline && !isOfflineMode) {
        try {
          const { data, error } = await supabase
            .from('user_recipes')
            .select(`
              *,
              cuisine:cuisines(name),
              meal_type:meal_types(name),
              ingredients:user_recipe_ingredients(amount, unit, raw_name, ingredient:ingredients(name, category_id))
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            throw error
          }

          // Load ratings for each recipe (optional, with error handling)
          const recipesWithRatings = await Promise.all(
            (data || []).map(async (recipe) => {
              try {
                const { data: ratingData } = await supabase
                  .from('ratings')
                  .select('score')
                  .eq('user_id', user.id)
                  .eq('recipe_scope', 'user')
                  .eq('recipe_key', recipe.user_recipe_id)
                  .single()

                return {
                  ...recipe,
                  rating: ratingData?.score || 0
                }
              } catch (error) {
                // If ratings table doesn't exist or has issues, continue without ratings
                console.warn('Could not load ratings for recipe:', recipe.user_recipe_id, error)
                return {
                  ...recipe,
                  rating: 0
                }
              }
            })
          )

          setRecipes(recipesWithRatings)
          return
        } catch (error) {
          console.warn('Online load failed, falling back to offline:', error)
          setIsOfflineMode(true)
        }
      }

      // Fallback to empty state
      setRecipes([])
      setIsOfflineMode(true)

    } catch (error) {
      console.error('Error loading recipes:', error)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const filterRecipes = () => {
    let filtered = [...recipes]

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.cuisine?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'cuisine':
          const cuisineA = a.cuisine?.name || 'Unknown'
          const cuisineB = b.cuisine?.name || 'Unknown'
          return cuisineA.localeCompare(cuisineB)
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredRecipes(filtered)
  }

  const toggleFavorite = async (recipeId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_recipes')
        .update({ is_favorite: !currentStatus })
        .eq('user_recipe_id', recipeId)

      if (error) {
        console.error('Error updating favorite:', error)
        return
      }

      setRecipes(prev => prev.map(recipe =>
        recipe.user_recipe_id === recipeId
          ? { ...recipe, is_favorite: !currentStatus }
          : recipe
      ))
    } catch (error) {
      console.error('Error updating favorite:', error)
    }
  }

  const toggleRecipeSelection = (recipeId: number) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const selectAllRecipes = () => {
    setSelectedRecipes(new Set(filteredRecipes.map(recipe => recipe.user_recipe_id)))
  }

  const clearSelection = () => {
    setSelectedRecipes(new Set())
  }

  const deleteRecipeImage = async (imageUrl: string): Promise<boolean> => {
    try {
      if (!imageUrl) return true

      // Extract file path from URL
      const urlObj = new URL(imageUrl)
      const pathParts = urlObj.pathname.split('/')
      const bucketIndex = pathParts.findIndex(part => part === 'recipes-images')
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        
        const { error } = await supabase.storage
          .from('recipes-images')
          .remove([filePath])

        if (error) {
          console.warn('Warning: Could not delete image from storage:', error)
          return false
        }
        
        console.log(`✅ Successfully deleted image: ${filePath}`)
        return true
      }
      
      return false
    } catch (error) {
      console.warn('Error deleting image:', error)
      return false
    }
  }

  const deleteSelectedRecipes = async () => {
    if (selectedRecipes.size === 0) return

    setIsDeleting(true)
    try {
      const recipeIds = Array.from(selectedRecipes)
      
      // Get recipes with images before deleting
      const selectedRecipesData = recipes.filter(recipe => selectedRecipes.has(recipe.user_recipe_id))
      const imageUrls = selectedRecipesData
        .map(recipe => recipe.image_url)
        .filter(Boolean) as string[]

      // Delete associated images from storage
      if (imageUrls.length > 0) {
        console.log(`🗑️ Deleting ${imageUrls.length} images from storage...`)
        
        // Delete images one by one for better error handling
        const deletePromises = imageUrls.map(url => deleteRecipeImage(url))
        const results = await Promise.all(deletePromises)
        const successCount = results.filter(Boolean).length
        
        console.log(`✅ Successfully deleted ${successCount}/${imageUrls.length} images from storage`)
      }
      
      // Delete recipes from database
      const { error } = await supabase
        .from('user_recipes')
        .delete()
        .in('user_recipe_id', recipeIds)

      if (error) {
        console.error('Error deleting recipes:', error)
        return
      }

      // Update local state
      setRecipes(prev => prev.filter(recipe => !selectedRecipes.has(recipe.user_recipe_id)))
      setSelectedRecipes(new Set())
      
      console.log(`✅ Successfully deleted ${recipeIds.length} recipes and their associated images`)
    } catch (error) {
      console.error('Error deleting recipes:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    // Convert ISO duration or simple time strings
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  const calculateTotalTime = (prepTime?: string, cookTime?: string) => {
    if (!prepTime && !cookTime) return ''
    
    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0
      
      // Handle ISO duration format (PT1H30M)
      const isoMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
      if (isoMatch) {
        const hours = parseInt(isoMatch[1] || '0')
        const minutes = parseInt(isoMatch[2] || '0')
        return hours * 60 + minutes
      }
      
      // Handle simple formats like "1h 30m", "90m", "1h", "30 minutes", "2 hours"
      const simpleMatch = timeStr.match(/(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:inutes?)?)?/)
      if (simpleMatch) {
        const hours = parseInt(simpleMatch[1] || '0')
        const minutes = parseInt(simpleMatch[2] || '0')
        return hours * 60 + minutes
      }
      
      // Handle just numbers (assume minutes)
      const numberMatch = timeStr.match(/^(\d+)$/)
      if (numberMatch) {
        const minutes = parseInt(numberMatch[1])
        return minutes
      }
      
      return 0
    }
    
    const prepMinutes = parseTime(prepTime || '')
    const cookMinutes = parseTime(cookTime || '')
    const totalMinutes = prepMinutes + cookMinutes
    
    if (totalMinutes === 0) return ''
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your cookbook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">My Cookbook</h1>
              <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
                {recipes.length} recipes
              </span>
              {isOfflineMode && (
                <div className="flex items-center space-x-1 bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </div>
              )}
            </div>
            
                    <div className="flex items-center space-x-4">
                      {selectedRecipes.size > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {selectedRecipes.size} selected
                          </span>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={deleteSelectedRecipes}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Delete Selected
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={clearSelection}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={viewMode === 'table' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('table')}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'cards' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('cards')}
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Button onClick={() => router.push('/add')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Recipe
                      </Button>
                    </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search your recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('date')}
                >
                  Most Recent
                </Button>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('name')}
                >
                  Alphabetical
                </Button>
                <Button
                  variant={sortBy === 'cuisine' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('cuisine')}
                >
                  Cuisine
                </Button>
                <Button
                  variant={sortBy === 'rating' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('rating')}
                >
                  Rating
                </Button>
              </div>

              {filteredRecipes.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllRecipes}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipes Display */}
        {filteredRecipes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchQuery ? 'No recipes found' : 'Your cookbook is empty'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Start by adding your first recipe or importing from the web'
                }
              </p>
              <Button onClick={() => router.push('/add')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Recipe
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.user_recipe_id}
                recipe={recipe}
                showAddButton={false}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedRecipes.size === filteredRecipes.length && filteredRecipes.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllRecipes()
                            } else {
                              clearSelection()
                            }
                          }}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cuisine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Servings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecipes.map((recipe) => (
                      <tr 
                        key={recipe.user_recipe_id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRecipes.has(recipe.user_recipe_id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleRecipeSelection(recipe.user_recipe_id)
                            }}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => router.push(`/recipe/${recipe.user_recipe_id}`)}
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              {recipe.image_url ? (
                                <img 
                                  className="h-12 w-12 rounded-lg object-cover" 
                                  src={recipe.image_url} 
                                  alt={recipe.title}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                  <ChefHat className="w-6 h-6 text-orange-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {recipe.title}
                              </div>
                              {recipe.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {recipe.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => router.push(`/recipe/${recipe.user_recipe_id}`)}
                        >
                          <div className="flex flex-col space-y-1">
                            {recipe.cuisine && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {recipe.cuisine.name}
                              </span>
                            )}
                            {recipe.meal_type && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {recipe.meal_type.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                          onClick={() => router.push(`/recipe/${recipe.user_recipe_id}`)}
                        >
                          {(() => {
                            const calculatedTime = calculateTotalTime(recipe.prep_time, recipe.cook_time)
                            return calculatedTime && (
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                {calculatedTime}
                              </div>
                            )
                          })()}
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                          onClick={() => router.push(`/recipe/${recipe.user_recipe_id}`)}
                        >
                          {recipe.servings && (
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1 text-gray-400" />
                              {recipe.servings}
                            </div>
                          )}
                        </td>
                        <td 
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => router.push(`/recipe/${recipe.user_recipe_id}`)}
                        >
                          {recipe.rating > 0 ? (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 fill-current text-yellow-400 mr-1" />
                              <span className="text-sm text-gray-900">{recipe.rating}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/recipe/${recipe.user_recipe_id}/edit`)
                              }}
                              className="text-gray-400 hover:text-blue-500 transition-colors"
                              title="Edit recipe"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(recipe.user_recipe_id, recipe.is_favorite)
                              }}
                              className="text-gray-300 hover:text-yellow-500 transition-colors"
                              title={recipe.is_favorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star className={`w-5 h-5 ${recipe.is_favorite ? 'fill-current text-yellow-500' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}


