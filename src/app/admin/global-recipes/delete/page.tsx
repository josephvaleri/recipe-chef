'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'
import { Search, Plus, Star, Clock, Users, ChefHat, Trash2, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'

interface GlobalRecipe {
  recipe_id: number
  title: string
  description?: string
  image_url?: string
  prep_time?: string
  cook_time?: string
  servings?: string
  difficulty?: string
  cuisine?: { name: string }
  meal_type?: { name: string }
  is_published: boolean
  added_count: number
  created_at: string
  rating?: number
}

export default function DeleteGlobalRecipesPage() {
  const [recipes, setRecipes] = useState<GlobalRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRecipes, setFilteredRecipes] = useState<GlobalRecipe[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'rating' | 'cuisine'>('date')
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const currentProfile = await getCurrentProfile()
      
      if (!currentUser || !currentProfile) {
        router.push('/auth/signin')
        return
      }

      if (!isAdmin(currentProfile)) {
        router.push('/')
        return
      }

      setUser(currentUser)
      setProfile(currentProfile)
      await loadRecipes()
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/auth/signin')
    } finally {
      setLoading(false)
    }
  }

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('global_recipes')
        .select(`
          recipe_id,
          title,
          description,
          image_url,
          prep_time,
          cook_time,
          servings,
          difficulty,
          is_published,
          added_count,
          created_at,
          cuisines(name),
          meal_types(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedRecipes = data?.map(recipe => ({
        ...recipe,
        cuisine: Array.isArray(recipe.cuisines) && recipe.cuisines.length > 0 ? recipe.cuisines[0] : recipe.cuisines,
        meal_type: Array.isArray(recipe.meal_types) && recipe.meal_types.length > 0 ? recipe.meal_types[0] : recipe.meal_types
      })) || []

      setRecipes(formattedRecipes)
      setFilteredRecipes(formattedRecipes)
    } catch (error) {
      console.error('Error loading recipes:', error)
    }
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

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredRecipes(recipes)
      return
    }

    const filtered = recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(query.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(query.toLowerCase()) ||
      recipe.cuisine?.name.toLowerCase().includes(query.toLowerCase()) ||
      recipe.meal_type?.name.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredRecipes(filtered)
  }

  const handleSort = (newSortBy: 'name' | 'date' | 'rating' | 'cuisine') => {
    setSortBy(newSortBy)
    const sorted = [...filteredRecipes].sort((a, b) => {
      switch (newSortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'cuisine':
          return (a.cuisine?.name || '').localeCompare(b.cuisine?.name || '')
        default:
          return 0
      }
    })
    setFilteredRecipes(sorted)
  }

  const toggleRecipeSelection = (recipeId: number) => {
    const newSelected = new Set(selectedRecipes)
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId)
    } else {
      newSelected.add(recipeId)
    }
    setSelectedRecipes(newSelected)
  }

  const selectAllRecipes = () => {
    setSelectedRecipes(new Set(filteredRecipes.map(recipe => recipe.recipe_id)))
  }

  const clearSelection = () => {
    setSelectedRecipes(new Set())
  }

  const handleDeleteSelected = async () => {
    if (selectedRecipes.size === 0) return

    const selectedTitles = filteredRecipes
      .filter(recipe => selectedRecipes.has(recipe.recipe_id))
      .map(recipe => recipe.title)

    if (!confirm(`Are you sure you want to delete these ${selectedRecipes.size} recipe(s)?\n\n${selectedTitles.join('\n')}\n\nThis action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('global_recipes')
        .delete()
        .in('recipe_id', Array.from(selectedRecipes))

      if (error) throw error

      // Reload recipes
      await loadRecipes()
      setSelectedRecipes(new Set())
      alert(`Successfully deleted ${selectedRecipes.size} recipe(s)`)
    } catch (error) {
      console.error('Error deleting recipes:', error)
      alert('Failed to delete recipes')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteSingle = async (recipeId: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('global_recipes')
        .delete()
        .eq('recipe_id', recipeId)

      if (error) throw error

      // Reload recipes
      await loadRecipes()
      alert(`Successfully deleted "${title}"`)
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-pulse" />
          <p className="text-orange-700">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-900">Delete Global Recipes</h1>
              <p className="text-orange-700">Remove recipes from the global cookbook</p>
            </div>
          </div>

          {/* Warning */}
          <Card className="bg-red-50 border-red-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  Warning: Deleting recipes will permanently remove them from the global cookbook. This action cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search and Controls */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search recipes..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 border-orange-300 focus:border-orange-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => handleSort(e.target.value as any)}
                      className="border border-orange-300 rounded-md px-3 py-1 text-sm focus:border-orange-500 focus:outline-none"
                    >
                      <option value="date">Date Added</option>
                      <option value="name">Name</option>
                      <option value="rating">Rating</option>
                      <option value="cuisine">Cuisine</option>
                    </select>
                  </div>
                  
                  {selectedRecipes.size > 0 && (
                    <Button
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete Selected ({selectedRecipes.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipes Table */}
          {filteredRecipes.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchQuery ? 'No recipes found' : 'No global recipes yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'No recipes available to delete'
                  }
                </p>
              </CardContent>
            </Card>
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
                          Added Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecipes.map((recipe) => (
                        <tr 
                          key={recipe.recipe_id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedRecipes.has(recipe.recipe_id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleRecipeSelection(recipe.recipe_id)
                              }}
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12">
                                {recipe.image_url ? (
                                  <img 
                                    className="h-12 w-12 rounded-lg object-cover" 
                                    src={recipe.image_url} 
                                    alt={recipe.title}
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <ChefHat className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{recipe.title}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {recipe.description || 'No description'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {recipe.cuisine?.name || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {recipe.servings && (
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1 text-gray-400" />
                                {recipe.servings}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {recipe.added_count} times
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              recipe.is_published 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {recipe.is_published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSingle(recipe.recipe_id, recipe.title)
                              }}
                              disabled={isDeleting}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}