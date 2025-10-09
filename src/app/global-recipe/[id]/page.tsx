'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'
import { scaleAmount } from '@/lib/utils'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { RecipeTimer } from '@/components/recipe-timer'
import { 
  ChefHat, 
  Clock, 
  Users, 
  Star, 
  Edit, 
  Trash2, 
  Printer, 
  Heart, 
  MessageCircle,
  ArrowLeft,
  ChefHat as DifficultyIcon,
  Timer,
  List,
  CheckCircle,
  AlertCircle,
  Globe,
  Plus
} from 'lucide-react'

interface RecipeData {
  recipe_id: number
  title: string
  description?: string
  image_url?: string
  prep_time?: string
  cook_time?: string
  total_time?: string
  servings?: string
  difficulty?: string
  source_name?: string
  source_url?: string
  is_published: boolean
  added_count: number
  created_at: string
  cuisine?: { name: string }
  meal_type?: { name: string }
  ingredients: Array<{
    amount?: string
    unit?: string
    ingredient?: { name: string }
  }>
  steps: Array<{
    step_number: number
    text: string
  }>
  rating?: number
}

interface MatchedIngredient {
  ingredient: {
    name: string
    category: {
      name: string
    }
  }
  matched_term?: string
  match_type: 'exact' | 'alias'
}

export default function GlobalRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [servings, setServings] = useState(1)
  const [showGlobalCookbookDialog, setShowGlobalCookbookDialog] = useState(false)
  const [addingToGlobalCookbook, setAddingToGlobalCookbook] = useState(false)
  const [detailedIngredients, setDetailedIngredients] = useState<{[key: string]: MatchedIngredient[]}>({})
  const [unmatchedIngredients, setUnmatchedIngredients] = useState<string[]>([])
  const [loadingDetailedIngredients, setLoadingDetailedIngredients] = useState(false)
  const [savingIngredients, setSavingIngredients] = useState(false)
  const [ingredientsSaved, setIngredientsSaved] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params
      console.log('Global recipe page loading with ID:', resolvedParams.id)
      loadRecipe(resolvedParams.id)
      checkAuth()
    }
    initializePage()
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
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/auth/signin')
    }
  }

  const loadRecipe = async (recipeId: string) => {
    try {
      console.log('Loading global recipe with ID:', recipeId, 'Type:', typeof recipeId)
      setLoading(true)
      
      // Load global recipe data
      const { data: recipeData, error: recipeError } = await supabase
        .from('global_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .eq('recipe_id', recipeId)
        .eq('is_published', true)
        .single()

      if (recipeError) {
        console.error('Error loading recipe:', recipeError)
        setError('Recipe not found')
        return
      }

      // Load ingredients - try to get raw_name first, fallback to ingredients table
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('global_recipe_ingredients')
        .select(`
          amount,
          unit,
          raw_name,
          ingredient:ingredients(name)
        `)
        .eq('recipe_id', recipeId)

      if (ingredientsError) {
        console.error('Error loading ingredients:', ingredientsError)
      } else {
        console.log('Loaded ingredients:', ingredientsData)
        console.log('Number of ingredients:', ingredientsData?.length || 0)
      }

      // Load steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('global_recipe_steps')
        .select('step_number, text')
        .eq('recipe_id', recipeId)
        .order('step_number')

      if (stepsError) {
        console.error('Error loading steps:', stepsError)
      }

      // Load rating
      const { data: ratingData } = await supabase
        .from('global_recipe_ratings')
        .select('rating')
        .eq('recipe_id', recipeId)
        .single()

      const recipe: RecipeData = {
        ...recipeData,
        ingredients: ingredientsData || [],
        steps: stepsData || [],
        rating: ratingData?.rating
      }

      console.log('Final recipe object:', recipe)
      console.log('Recipe ingredients:', recipe.ingredients)
      setRecipe(recipe)
      setServings(parseInt(recipe.servings || '1') || 1)

      // Check for saved detailed ingredients
      await loadSavedDetailedIngredients(recipeId)
      
    } catch (error) {
      console.error('Error loading recipe:', error)
      setError('Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }

  const loadSavedDetailedIngredients = async (recipeId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('global_recipe_ingredients_detail')
        .select(`
          *,
          ingredient:ingredients(name, category:ingredient_categories(name))
        `)
        .eq('recipe_id', recipeId)

      if (error) {
        console.error('Error loading saved ingredients:', error)
        return false
      }

      if (data && data.length > 0) {
        const matchedIngredients: MatchedIngredient[] = data.map((item: any) => ({
          ingredient: {
            name: item.ingredient?.name || 'Unknown',
            category: {
              name: item.ingredient?.category?.name || 'Unknown'
            }
          },
          matched_term: item.matched_term,
          match_type: item.match_type as 'exact' | 'alias'
        }))
        
        // Group ingredients by category
        const groupedIngredients = matchedIngredients.reduce((acc, ingredient) => {
          const categoryName = ingredient.ingredient.category.name
          if (!acc[categoryName]) {
            acc[categoryName] = []
          }
          acc[categoryName].push(ingredient)
          return acc
        }, {} as Record<string, MatchedIngredient[]>)
        
        setDetailedIngredients(groupedIngredients)
        setIngredientsSaved(true)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error loading saved detailed ingredients:', error)
      return false
    }
  }

  const loadDetailedIngredients = async () => {
    if (!recipe) return

    // First check if there are saved ingredients
    const hasSavedIngredients = await loadSavedDetailedIngredients(recipe.recipe_id.toString())
    if (hasSavedIngredients) {
      console.log('Found saved ingredients, displaying them instead of running analysis')
      return
    }

    // Only run analysis if no saved ingredients found
    setLoadingDetailedIngredients(true)
    try {
      // Parse each ingredient line to extract searchable terms
      const ingredientLines = recipe.ingredients.flatMap((ing: any) => {
        if (ing.raw_name) {
          // Split by line breaks to get individual ingredient lines
          return ing.raw_name.split('\n').filter((line: string) => line.trim())
        } else {
          // Fallback to structured data
          const fullText = `${ing.amount || ''}${ing.unit ? ` ${ing.unit}` : ''} ${ing.ingredient?.name || ''}`.trim()
          return fullText.split('\n').filter(line => line.trim())
        }
      })

      console.log('Parsed ingredient lines:', ingredientLines)
      console.log('Number of ingredient lines:', ingredientLines.length)

      if (ingredientLines.length === 0) {
        console.log('No ingredient lines found, skipping API call')
        setLoadingDetailedIngredients(false)
        return
      }

      const response = await fetch('/api/ingredients/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients: ingredientLines }),
      })

      console.log('API response status:', response.status)
      console.log('API response headers:', response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to search ingredients: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('API response data:', result)
      console.log('API response matched:', result.matched)
      console.log('API response unmatched:', result.unmatched)

      // The API already returns ingredients grouped by category
      // Convert the matched object to the expected format
      const groupedIngredients: {[key: string]: any[]} = {}
      
      Object.entries(result.matched || {}).forEach(([categoryName, ingredients]) => {
        if (Array.isArray(ingredients)) {
          // Transform API response structure to match UI expectations
          const transformedIngredients = ingredients.map((ingredient: any) => ({
            // Preserve database fields for saving
            ingredient_id: ingredient.ingredient_id,
            category_id: ingredient.category_id,
            original_text: ingredient.original_text,
            matched_term: ingredient.matched_term,
            match_type: ingredient.match_type,
            matched_alias: ingredient.matched_alias,
            // Add UI structure for display
            ingredient: {
              name: ingredient.name,
              category: {
                name: ingredient.category?.name || 'Unknown'
              }
            }
          }))
          groupedIngredients[categoryName] = transformedIngredients
        }
      })
      
      console.log('Grouped ingredients from API:', groupedIngredients)
      setDetailedIngredients(groupedIngredients)
      
      // Store unmatched ingredients for display
      setUnmatchedIngredients(result.unmatched || [])
      
      // Show the results immediately after analysis
      setIngredientsSaved(false) // Keep as false so we can show the +ADD button
    } catch (error) {
      console.error('Error loading detailed ingredients:', error)
    } finally {
      setLoadingDetailedIngredients(false)
    }
  }

  const saveDetailedIngredients = async () => {
    if (!recipe || Object.keys(detailedIngredients).length === 0) return

    setSavingIngredients(true)
    try {
      // Flatten all matched ingredients
      const allMatchedIngredients = Object.values(detailedIngredients).flat()
      
      // Use client-side Supabase to save directly
      const { error: deleteError } = await supabase
        .from('global_recipe_ingredients_detail')
        .delete()
        .eq('recipe_id', recipe.recipe_id)

      if (deleteError) {
        console.error('Error clearing existing ingredients:', deleteError)
        throw new Error('Failed to clear existing ingredients')
      }

      // Insert new ingredients
      const ingredientsToInsert = allMatchedIngredients.map((ingredient: any) => ({
        recipe_id: recipe.recipe_id,
        ingredient_id: ingredient.ingredient_id,
        original_text: ingredient.original_text,
        matched_term: ingredient.matched_term,
        match_type: ingredient.match_type,
        matched_alias: ingredient.matched_alias || null,
        category_id: ingredient.category_id || null
      }))

      const { data: insertedIngredients, error: insertError } = await supabase
        .from('global_recipe_ingredients_detail')
        .insert(ingredientsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting ingredients:', insertError)
        throw new Error('Failed to save ingredients')
      }

      setIngredientsSaved(true)
      console.log('Ingredients saved successfully:', insertedIngredients.length)
    } catch (error) {
      console.error('Error saving detailed ingredients:', error)
    } finally {
      setSavingIngredients(false)
    }
  }

  const reanalyzeIngredients = async () => {
    if (!recipe) return
    
    try {
      // Delete existing saved ingredients from database
      const { error: deleteError } = await supabase
        .from('global_recipe_ingredients_detail')
        .delete()
        .eq('recipe_id', recipe.recipe_id)
      
      if (deleteError) {
        console.error('Error clearing existing ingredients:', deleteError)
      }
      
      // Reset state and reload
      setIngredientsSaved(false)
      setDetailedIngredients({})
      await loadDetailedIngredients()
    } catch (error) {
      console.error('Error reanalyzing ingredients:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleScaleServings = (newServings: number) => {
    setServings(newServings)
  }

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'alias':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'Exact Match'
      case 'alias':
        return 'Alias Match'
      default:
        return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-orange-700">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700">{error || 'Recipe not found'}</p>
          <Button 
            onClick={() => router.push('/admin/global-recipes/edit')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Global Recipes
          </Button>
        </div>
      </div>
    )
  }

  const scaleFactor = servings / (parseInt(recipe.servings || '1') || 1)
  const scaledIngredients = recipe.ingredients.map(ingredient => ({
    ...ingredient,
    scaled_amount: scaleAmount(ingredient.amount || '', scaleFactor)
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            onClick={() => router.push('/admin/global-recipes/edit')}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Global Recipes
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => router.push(`/global-recipe/${recipe.recipe_id}/edit`)}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recipe Header */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-orange-900 mb-4">{recipe.title}</h1>
                    {recipe.description && (
                      <p className="text-lg text-orange-700 mb-4">{recipe.description}</p>
                    )}
                    
                    {/* Rating */}
                    {recipe.rating && (recipe.rating ?? 0) > 0 && (
                      <div className="flex items-center mb-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < (recipe.rating ?? 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-orange-700">({recipe.rating}/5)</span>
                      </div>
                    )}

                    {/* Cuisine and Meal Type */}
                    <div className="flex items-center space-x-4 mb-4">
                      {recipe.cuisine?.name && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {recipe.cuisine.name}
                        </Badge>
                      )}
                      {recipe.meal_type?.name && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {recipe.meal_type.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {recipe.image_url && (
                    <div className="ml-6">
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-32 h-32 object-cover rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recipe.prep_time && (
                    <div className="flex items-center text-orange-700">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">Prep: {recipe.prep_time}</span>
                    </div>
                  )}
                  {recipe.cook_time && (
                    <div className="flex items-center text-orange-700">
                      <Timer className="w-4 h-4 mr-2" />
                      <span className="text-sm">Cook: {recipe.cook_time}</span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center text-orange-700">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-sm">Serves {recipe.servings}</span>
                    </div>
                  )}
                  {recipe.difficulty && (
                    <div className="flex items-center text-orange-700">
                      <DifficultyIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">{recipe.difficulty}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* What you will need */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-900">
                  <List className="w-5 h-5 mr-2" />
                  What you will need
                </CardTitle>
                <CardDescription>
                  Ingredients for {servings} {servings === 1 ? 'serving' : 'servings'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scaledIngredients.length > 0 ? (
                    scaledIngredients.map((ingredient, index) => {
                      // Prioritize structured fields over raw_name
                      if (ingredient.amount || ingredient.unit || ingredient.ingredient?.name) {
                        // Use structured display
                        const displayText = [
                          ingredient.scaled_amount,
                          ingredient.unit,
                          ingredient.ingredient?.name
                        ].filter(Boolean).join(' ')
                        
                        return (
                          <div key={index} className="flex items-center text-orange-800">
                            <CheckCircle className="w-4 h-4 mr-3 text-green-600 flex-shrink-0" />
                            <span>{displayText}</span>
                          </div>
                        )
                      } else if ((ingredient as any).raw_name) {
                        // Simple: just split by newlines and display each line as an ingredient
                        const lines = (ingredient as any).raw_name
                          .split(/\r?\n/)
                          .map((line: string) => line.trim())
                          .filter((line: string) => line.length > 0)
                        
                        return lines.map((line: string, lineIndex: number) => (
                          <div key={`${index}-${lineIndex}`} className="flex items-center text-orange-800">
                            <CheckCircle className="w-4 h-4 mr-3 text-green-600 flex-shrink-0" />
                            <span>{line}</span>
                          </div>
                        ))
                      } else {
                        // No data available
                        return (
                          <div key={index} className="flex items-center text-orange-800">
                            <CheckCircle className="w-4 h-4 mr-3 text-green-600 flex-shrink-0" />
                            <span>Unknown ingredient</span>
                          </div>
                        )
                      }
                    }).flat()
                  ) : (
                    <div className="text-center py-4 text-orange-600">
                      <p>No ingredients found for this recipe.</p>
                      <p className="text-sm mt-2">This recipe may not have detailed ingredients saved yet.</p>
                    </div>
                  )}
                </div>
                
                {/* Servings Scale */}
                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <label className="block text-sm font-medium text-orange-900 mb-2">
                    Adjust servings:
                  </label>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleScaleServings(Math.max(1, servings - 1))}
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700"
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={servings}
                      onChange={(e) => handleScaleServings(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center border-orange-300"
                      min="1"
                    />
                    <Button
                      onClick={() => handleScaleServings(servings + 1)}
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-900">
                  <ChefHat className="w-5 h-5 mr-2" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recipe.steps.map((step, stepIndex) => {
                    // Split step text by \n to create paragraphs
                    const paragraphs = step.text.split('\n').filter(p => p.trim())
                    let globalIndex = 0
                    
                    // Calculate global index for this step
                    for (let i = 0; i < stepIndex; i++) {
                      globalIndex += recipe.steps[i].text.split('\n').filter(p => p.trim()).length
                    }
                    
                    return (
                      <div key={stepIndex} className="space-y-3">
                        {paragraphs.map((paragraph, paragraphIndex) => {
                          const currentGlobalIndex = globalIndex + paragraphIndex + 1
                          return (
                            <div key={paragraphIndex} className="flex items-start space-x-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                {currentGlobalIndex}
                              </div>
                              <p className="text-orange-800 leading-relaxed">{paragraph}</p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Ingredient Analysis */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-900">
                  <ChefHat className="w-5 h-5 mr-2" />
                  Ingredient Analysis
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of ingredients with nutritional categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(detailedIngredients).length === 0 ? (
                  <div className="text-center py-8">
                    <Button
                      onClick={loadDetailedIngredients}
                      disabled={loadingDetailedIngredients}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {loadingDetailedIngredients ? (
                        <>
                          <ChefHat className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <List className="w-4 h-4 mr-2" />
                          Detailed Ingredient List
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(detailedIngredients).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(detailedIngredients).map(([category, ingredients]) => (
                          <div key={category} className="border border-orange-200 rounded-lg p-4">
                            <h4 className="font-semibold text-orange-900 mb-2">{category}</h4>
                            <div className="space-y-2">
                              {ingredients.map((ingredient, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-orange-800">{ingredient.ingredient.name}</span>
                                  <Badge className={getMatchTypeColor(ingredient.match_type)}>
                                    {getMatchTypeLabel(ingredient.match_type)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-orange-600">
                        No detailed ingredients found. Click "Detailed Ingredient List" to analyze.
                      </div>
                    )}
                    
                    {/* Unmatched Ingredients */}
                    {unmatchedIngredients.length > 0 && (
                      <div className="mt-6 border border-red-200 rounded-lg p-4 bg-red-50">
                        <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Not Found ({unmatchedIngredients.length})
                        </h4>
                        <div className="space-y-2">
                          {unmatchedIngredients.map((ingredient, index) => {
                            // Parse raw ingredient text that might have newlines
                            const lines = ingredient
                            .split(/\r?\n/)
                            .map(line => line.trim())
                            .filter(line => line.length > 0)
                            const parsedIngredients = []
                            
                            // Group lines into complete ingredients (amount + description)
                            for (let i = 0; i < lines.length; i += 2) {
                              if (i + 1 < lines.length) {
                                const amount = lines[i].trim()
                                const description = lines[i + 1].trim()
                                parsedIngredients.push(`${amount} ${description}`)
                              } else {
                                // Odd number of lines, just use the last line
                                parsedIngredients.push(lines[i].trim())
                              }
                            }
                            
                            return parsedIngredients.map((parsedIngredient, lineIndex) => (
                              <div key={`${index}-${lineIndex}`} className="flex items-center text-red-700">
                                <span className="text-red-600 mr-2">•</span>
                                <span>{parsedIngredient}</span>
                              </div>
                            ))
                          }).flat()}
                        </div>
                        <p className="text-sm text-red-600 mt-2">
                          These ingredients couldn't be matched to our database. You may need to add them manually.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {!ingredientsSaved && Object.keys(detailedIngredients).length > 0 && (
                        <Button
                          onClick={saveDetailedIngredients}
                          disabled={savingIngredients}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {savingIngredients ? 'Saving...' : '+ADD to Recipe'}
                        </Button>
                      )}
                      {ingredientsSaved && (
                        <Button
                          onClick={reanalyzeIngredients}
                          disabled={loadingDetailedIngredients}
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          {loadingDetailedIngredients ? (
                            <>
                              <ChefHat className="w-4 h-4 mr-2 animate-spin" />
                              Reanalyzing...
                            </>
                          ) : (
                            'Reanalyze'
                          )}
                        </Button>
                      )}
                      {!ingredientsSaved && Object.keys(detailedIngredients).length > 0 && (
                        <Button
                          onClick={reanalyzeIngredients}
                          disabled={loadingDetailedIngredients}
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          {loadingDetailedIngredients ? (
                            <>
                              <ChefHat className="w-4 h-4 mr-2 animate-spin" />
                              Reanalyzing...
                            </>
                          ) : (
                            'Reanalyze'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Chef Tony */}
            <ChefOuiOui />
            
            {/* Recipe Timer */}
            <RecipeTimer />
          </div>
        </div>
      </div>
    </div>
  )
}
