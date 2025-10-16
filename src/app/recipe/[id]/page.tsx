'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { scaleAmount } from '@/lib/utils'
import { sanitizeText, sanitizeHTML } from '@/lib/sanitize'
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
  user_recipe_id: number
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
  is_favorite: boolean
  created_at: string
  cuisine?: { name: string }
  meal_type?: { name: string }
  ingredients: Array<{
    amount?: string
    unit?: string
    raw_name?: string
    ingredient?: { name: string }
  }>
  steps: Array<{
    step_number: number
    text: string
  }>
  equipment: Array<{
    equipment: { name: string }
  }>
  tags: Array<{
    tag: { name: string }
  }>
  rating?: number
}

interface MatchedIngredient {
  ingredient_id: number
  name: string
  category_id: number
  category: { name: string }
  original_text: string
  match_type: 'exact' | 'alias'
  matched_term?: string
  matched_alias?: string
}

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scaleFactor, setScaleFactor] = useState(1)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [detailedIngredients, setDetailedIngredients] = useState<Record<string, MatchedIngredient[]>>({})
  const [unmatchedIngredients, setUnmatchedIngredients] = useState<string[]>([])
  const [showDetailedIngredients, setShowDetailedIngredients] = useState(false)
  const [loadingDetailedIngredients, setLoadingDetailedIngredients] = useState(false)
  const [savingIngredients, setSavingIngredients] = useState(false)
  const [ingredientsSaved, setIngredientsSaved] = useState(false)
  const [showGlobalCookbookDialog, setShowGlobalCookbookDialog] = useState(false)
  const [addingToGlobalCookbook, setAddingToGlobalCookbook] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const resolvedParams = await params
      await loadRecipe(resolvedParams.id)
      await loadProfile()
      
      // Check for saved detailed ingredients after recipe loads
      if (recipe) {
        const hasSavedIngredients = await loadSavedDetailedIngredients()
        if (!hasSavedIngredients) {
          // No saved ingredients found, show the analysis button
          setShowDetailedIngredients(false)
        }
      }
    }
    loadData()
  }, [params])

  // Separate useEffect to check for saved ingredients when recipe changes
  useEffect(() => {
    if (recipe) {
      loadSavedDetailedIngredients()
    }
  }, [recipe])

  const loadRecipe = async (recipeId: string) => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Load recipe data
      const { data: recipeData, error: recipeError } = await supabase
        .from('user_recipes')
        .select(`
          *,
          cuisine:cuisines(name),
          meal_type:meal_types(name)
        `)
        .eq('user_recipe_id', recipeId)
        .eq('user_id', user.id)
        .single()

      if (recipeError) {
        console.error('Error loading recipe:', recipeError)
        setError('Recipe not found')
        return
      }

      // Load ingredients
      const { data: ingredientsData } = await supabase
        .from('user_recipe_ingredients')
        .select(`
          amount,
          unit,
          raw_name,
          ingredient:ingredients(name)
        `)
        .eq('user_recipe_id', recipeId)

      // Load steps
      const { data: stepsData } = await supabase
        .from('user_recipe_steps')
        .select('step_number, text')
        .eq('user_recipe_id', recipeId)
        .order('step_number')

      // Load equipment
      const { data: equipmentData } = await supabase
        .from('user_recipe_equipment')
        .select('equipment:equipment(name)')
        .eq('user_recipe_id', recipeId)

      // Load tags
      const { data: tagsData } = await supabase
        .from('user_recipe_tags')
        .select('tag:tags(name)')
        .eq('user_recipe_id', recipeId)

      // Load rating
      const { data: ratingData } = await supabase
        .from('ratings')
        .select('score')
        .eq('user_id', user.id)
        .eq('recipe_scope', 'user')
        .eq('recipe_key', recipeId)
        .maybeSingle()

      console.log('Loaded ingredients:', ingredientsData)
      
      setRecipe({
        ...recipeData,
        ingredients: ingredientsData || [],
        steps: stepsData || [],
        equipment: equipmentData || [],
        tags: tagsData || [],
        rating: ratingData?.score || 0
      })
    } catch (error) {
      console.error('Error loading recipe:', error)
      setError('Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }

  const loadProfile = async () => {
    const profileData = await getCurrentProfile()
    setProfile(profileData)
  }

  const loadDetailedIngredients = async () => {
    if (!recipe) return

    // First check if there are saved ingredients
    const hasSavedIngredients = await loadSavedDetailedIngredients()
    if (hasSavedIngredients) {
      console.log('Found saved ingredients, displaying them instead of running analysis')
      return
    }

    // Only run analysis if no saved ingredients found
    setLoadingDetailedIngredients(true)
    try {
      // Parse each ingredient line to extract searchable terms
      const ingredientLines = recipe.ingredients.flatMap(ing => {
        const fullText = `${ing.amount ? scaleAmount(ing.amount, scaleFactor) : ''}${ing.unit ? ` ${ing.unit}` : ''} ${ing.raw_name || ing.ingredient?.name || ''}`.trim()
        // Split by line breaks to get individual ingredient lines
        return fullText.split('\n').filter(line => line.trim())
      })

      console.log('Parsed ingredient lines:', ingredientLines)

      const response = await fetch('/api/ingredients/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients: ingredientLines }),
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to search ingredients: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('API response data:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setDetailedIngredients(data.matched || {})
      setUnmatchedIngredients(data.unmatched || [])
      setShowDetailedIngredients(true)
      setIngredientsSaved(false) // Reset saved state when reanalyzing
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
        .from('user_recipe_ingredients_detail')
        .delete()
        .eq('user_recipe_id', recipe.user_recipe_id)

      if (deleteError) {
        console.error('Error clearing existing ingredients:', deleteError)
        throw new Error('Failed to clear existing ingredients')
      }

      // Insert new ingredients
      const ingredientsToInsert = allMatchedIngredients.map((ingredient: any) => ({
        user_recipe_id: recipe.user_recipe_id,
        ingredient_id: ingredient.ingredient_id,
        original_text: ingredient.original_text,
        matched_term: ingredient.matched_term,
        match_type: ingredient.match_type,
        matched_alias: ingredient.matched_alias || null
      }))

      const { data: insertedIngredients, error: insertError } = await supabase
        .from('user_recipe_ingredients_detail')
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

  const loadSavedDetailedIngredients = async () => {
    if (!recipe) return

    try {
      // Use client-side Supabase to load directly
      const { data: savedIngredients, error: loadError } = await supabase
        .from('user_recipe_ingredients_detail')
        .select(`
          detail_id,
          original_text,
          matched_term,
          match_type,
          matched_alias,
          ingredient_id,
          ingredients!inner(
            ingredient_id,
            name,
            category_id,
            ingredient_categories!inner(name)
          )
        `)
        .eq('user_recipe_id', recipe.user_recipe_id)

      if (loadError) {
        console.error('Error loading saved ingredients:', loadError)
        return false
      }

      if (savedIngredients && savedIngredients.length > 0) {
        console.log('Debug: Raw saved ingredients data:', savedIngredients)
        
        // Group ingredients by category
        const groupedIngredients = savedIngredients.reduce((acc, item) => {
          console.log('Debug: Processing item:', item)
          console.log('Debug: item.ingredients:', item.ingredients)
          
          // Access the joined ingredients data (it's a direct object, not an array)
          const ingredient = item.ingredients as any
          const category = ingredient?.ingredient_categories as any
          const categoryName = category?.name || 'Unknown'
          
          console.log('Debug: ingredient:', ingredient)
          console.log('Debug: category:', category)
          console.log('Debug: categoryName:', categoryName)
          
          if (!acc[categoryName]) {
            acc[categoryName] = []
          }
          acc[categoryName].push({
            ingredient_id: ingredient?.ingredient_id || 0,
            name: ingredient?.name || 'Unknown',
            category_id: ingredient?.category_id || 0,
            category: category || { name: 'Unknown' },
            original_text: item.original_text,
            match_type: item.match_type,
            matched_term: item.matched_term,
            matched_alias: item.matched_alias
          })
          return acc
        }, {} as Record<string, MatchedIngredient[]>)

        setDetailedIngredients(groupedIngredients)
        setUnmatchedIngredients([])
        setShowDetailedIngredients(true)
        setIngredientsSaved(true)
        return true // Found saved ingredients
      }
    } catch (error) {
      console.error('Error loading saved detailed ingredients:', error)
    }
    
    return false // No saved ingredients found
  }

  const reanalyzeIngredients = async () => {
    if (!recipe) return

    setLoadingDetailedIngredients(true)
    try {
      // Parse each ingredient line to extract searchable terms
      const ingredientLines = recipe.ingredients.flatMap(ing => {
        const fullText = `${ing.amount ? scaleAmount(ing.amount, scaleFactor) : ''}${ing.unit ? ` ${ing.unit}` : ''} ${ing.raw_name || ing.ingredient?.name || ''}`.trim()
        // Split by line breaks to get individual ingredient lines
        return fullText.split('\n').filter(line => line.trim())
      })

      console.log('Reanalyzing ingredient lines:', ingredientLines)

      const response = await fetch('/api/ingredients/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients: ingredientLines }),
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to search ingredients: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('API response data:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setDetailedIngredients(data.matched || {})
      setUnmatchedIngredients(data.unmatched || [])
      setShowDetailedIngredients(true)
      setIngredientsSaved(false) // Reset saved state when reanalyzing
    } catch (error) {
      console.error('Error reanalyzing ingredients:', error)
    } finally {
      setLoadingDetailedIngredients(false)
    }
  }

  const addToGlobalCookbook = async () => {
    console.log('=== FRONTEND DEBUG START ===')
    if (!recipe) return

    setAddingToGlobalCookbook(true)
    try {
      // Get current user to ensure we're authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Please sign in to submit recipes to the Global Cookbook')
      }

      console.log('Frontend: Submitting recipe to global cookbook:', {
        user_recipe_id: recipe.user_recipe_id,
        title: recipe.title,
        hasDetailedIngredients: ingredientsSaved
      })

      // Use client-side Supabase to add to global_candidates table directly
      // This bypasses the server-side authentication issues
      const { data: candidateData, error: candidateError } = await supabase
        .from('global_candidates')
        .insert({
          submitted_by: user.id,
          status: 'pending',
          data: {
            user_recipe_id: recipe.user_recipe_id,
            title: recipe.title,
            description: recipe.description,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            total_time: recipe.total_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            image_url: recipe.image_url,
            cuisine: recipe.cuisine,
            meal_type: recipe.meal_type,
            detailed_ingredients: detailedIngredients
          }
        })
        .select()

      if (candidateError) {
        console.error('Frontend: Error inserting to global_candidates:', candidateError)
        throw new Error(`Failed to submit recipe: ${candidateError.message}`)
      }

      console.log('Frontend: Successfully added to global_candidates:', candidateData)
      alert('Recipe successfully submitted for review! It will be reviewed by moderators before being added to the Global Cookbook.')
      setShowGlobalCookbookDialog(false)
    } catch (error) {
      console.error('Frontend: Error adding to global cookbook:', error)
      console.error('Frontend: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      })
      alert(`Failed to add recipe to global cookbook: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setAddingToGlobalCookbook(false)
      console.log('=== FRONTEND DEBUG END ===')
    }
  }

  const toggleFavorite = async () => {
    if (!recipe) return

    try {
      const { error } = await supabase
        .from('user_recipes')
        .update({ is_favorite: !recipe.is_favorite })
        .eq('user_recipe_id', recipe.user_recipe_id)

      if (error) {
        console.error('Error updating favorite:', error)
        return
      }

      setRecipe(prev => prev ? { ...prev, is_favorite: !prev.is_favorite } : null)
    } catch (error) {
      console.error('Error updating favorite:', error)
    }
  }

  const handleRating = async (rating: number) => {
    if (!recipe) return

    try {
      const user = await getCurrentUser()
      if (!user) return

      const { error } = await supabase
        .from('ratings')
        .upsert({
          user_id: user.id,
          recipe_scope: 'user',
          recipe_key: recipe.user_recipe_id,
          score: rating
        })

      if (error) {
        console.error('Error saving rating:', error)
        return
      }

      setRecipe(prev => prev ? { ...prev, rating } : null)
    } catch (error) {
      console.error('Error saving rating:', error)
    }
  }

  const askAI = async () => {
    if (!aiQuestion.trim() || !profile?.has_ai_subscription) return

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: aiQuestion,
          recipe: {
            title: recipe?.title,
            cuisine: recipe?.cuisine?.name,
            description: recipe?.description
          }
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setAiAnswer(data.answer)
      } else {
        setAiAnswer('Sorry, I couldn\'t answer that question right now.')
      }
    } catch (error) {
      setAiAnswer('Sorry, I encountered an error while processing your question.')
    } finally {
      setAiLoading(false)
    }
  }

  const generatePDF = async () => {
    if (!recipe) return

    try {
      const response = await fetch('/api/pdf/recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: recipe.user_recipe_id,
          scope: 'user'
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const deleteRecipe = async () => {
    if (!recipe || !confirm('Are you sure you want to delete this recipe?')) return

    try {
      // First, delete meal plan entries that reference this recipe
      const { error: mealPlanError } = await supabase
        .from('meal_plan')
        .delete()
        .eq('user_recipe_id', recipe.user_recipe_id)
      
      if (mealPlanError) {
        console.warn('Warning: Could not delete meal plan entries:', mealPlanError)
        // Continue anyway - the meal plan entry might not exist
      }
      
      const { error } = await supabase
        .from('user_recipes')
        .delete()
        .eq('user_recipe_id', recipe.user_recipe_id)

      if (error) {
        console.error('Error deleting recipe:', error)
        alert(`Failed to delete recipe: ${error.message}`)
        return
      }

      router.push('/cookbook')
    } catch (error) {
      console.error('Error deleting recipe:', error)
    }
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-100 text-green-800'
      case 'alias': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'Exact Match'
      case 'alias': return 'Alias Match'
      default: return 'Match'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recipe Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/cookbook')}>
            Back to Cookbook
          </Button>
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
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 truncate">{recipe.title}</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowGlobalCookbookDialog(true)}
                disabled={!ingredientsSaved}
                title={ingredientsSaved ? "Submit to Global Cookbook for Review" : "Detailed ingredients must be analyzed first"}
              >
                <div className="relative">
                  <Globe className={`w-4 h-4 ${!ingredientsSaved ? 'text-gray-400' : ''}`} />
                  <Plus className={`w-2 h-2 absolute -top-1 -right-1 rounded-full ${!ingredientsSaved ? 'bg-gray-400' : 'bg-orange-500'} text-white`} />
                </div>
              </Button>
              <Button variant="outline" size="sm" onClick={toggleFavorite}>
                <Heart className={`w-4 h-4 ${recipe.is_favorite ? 'fill-current text-red-500' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push(`/recipe/${recipe.user_recipe_id}/edit`)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={deleteRecipe}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={generatePDF}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recipe Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Header */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {recipe.image_url ? (
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={recipe.image_url} 
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-16 h-16 text-orange-400" />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{sanitizeText(recipe.title)}</h1>
                    {recipe.description && (
                      <p className="text-gray-600">{sanitizeText(recipe.description)}</p>
                    )}
                  </div>

                  {/* Recipe Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {recipe.prep_time && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Prep:</span>
                        <span className="ml-1">{formatTime(recipe.prep_time)}</span>
                      </div>
                    )}
                    {recipe.cook_time && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Cook:</span>
                        <span className="ml-1">{formatTime(recipe.cook_time)}</span>
                      </div>
                    )}
                    {recipe.total_time && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Total:</span>
                        <span className="ml-1">{formatTime(recipe.total_time)}</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Serves:</span>
                        <span className="ml-1">{recipe.servings}</span>
                      </div>
                    )}
                    {recipe.difficulty && (
                      <div className="flex items-center">
                        <DifficultyIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">Difficulty:</span>
                        <span className="ml-1">{recipe.difficulty}</span>
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRating(star)}
                          className="text-gray-300 hover:text-yellow-500 transition-colors"
                        >
                          <Star className={`w-5 h-5 ${star <= (recipe.rating ?? 0) ? 'fill-current text-yellow-500' : ''}`} />
                        </button>
                      ))}
                    </div>
                    {(recipe.rating ?? 0) > 0 && (
                      <span className="text-sm text-gray-500">({recipe.rating}/5)</span>
                    )}
                  </div>

                  {/* Cuisine and Meal Type */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {recipe.cuisine && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-600">Cuisine:</span>
                        <span className="ml-1 text-gray-900">{recipe.cuisine.name}</span>
                      </div>
                    )}
                    {recipe.meal_type && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-600">Meal Type:</span>
                        <span className="ml-1 text-gray-900">{recipe.meal_type.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map((tag, index) => (
                        <span key={index} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                          {tag.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Scaling Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Scale Recipe</CardTitle>
                <CardDescription>
                  Adjust serving size by scaling ingredient amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <label htmlFor="scale" className="text-sm font-medium">Scale to:</label>
                  <select
                    id="scale"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                    className="border rounded-md px-3 py-2"
                  >
                    <option value={0.25}>¼ recipe</option>
                    <option value={0.5}>½ recipe</option>
                    <option value={1}>1x recipe</option>
                    <option value={1.5}>1.5x recipe</option>
                    <option value={2}>2x recipe</option>
                    <option value={3}>3x recipe</option>
                    <option value={4}>4x recipe</option>
                  </select>
                  <span className="text-sm text-gray-500">
                    {scaleFactor !== 1 && (
                      <>
                        (Serves {recipe.servings ? Math.round(parseInt(recipe.servings) * scaleFactor) : '?'})
                      </>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* What you will need */}
            <Card>
              <CardHeader>
                <CardTitle>What you will need</CardTitle>
                <CardDescription>
                  {recipe.ingredients.length} ingredients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => {
                    // Get the ingredient name/text (could be multi-line)
                    const ingredientText = ingredient.raw_name || ingredient.ingredient?.name || ''
                    
                    // Split by line breaks first to handle multi-line ingredients
                    // Handle \r\n (Windows), \n (Unix), and \r (Mac/old data)
                    const lines = ingredientText
                      .split(/\r\n|\r|\n/)
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                    
                    // Only add amount/unit to the first line if it exists
                    if (lines.length > 0 && (ingredient.amount || ingredient.unit)) {
                      const amountUnit = [
                        ingredient.amount ? scaleAmount(ingredient.amount, scaleFactor) : '',
                        ingredient.unit || ''
                      ].filter(Boolean).join(' ').trim()
                      
                      if (amountUnit) {
                        lines[0] = `${amountUnit} ${lines[0]}`.trim()
                      }
                    }
                    
                    return lines.map((line, lineIndex) => (
                      <li key={`${index}-${lineIndex}`} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <span className="text-gray-900">{line}</span>
                        </div>
                      </li>
                    ))
                  }).flat()}
                </ul>
              </CardContent>
            </Card>


            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>
                  {recipe.steps.length} steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recipe.steps.flatMap((step, stepIndex) => 
                    step.text.split('\n')
                      .filter(paragraph => paragraph.trim()) // Remove empty paragraphs
                      .map((paragraph, paragraphIndex) => {
                        const globalIndex = recipe.steps
                          .slice(0, stepIndex)
                          .reduce((acc, prevStep) => acc + prevStep.text.split('\n').filter(p => p.trim()).length, 0) + paragraphIndex + 1;
                        
                        return (
                          <div key={`${step.step_number}-${paragraphIndex}`} className="flex items-start space-x-4">
                            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {globalIndex}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900 leading-relaxed">
                                {paragraph.trim()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Equipment */}
            {recipe.equipment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Needed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {recipe.equipment.map((item, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                        {item.equipment.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Ingredient Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Ingredient Analysis</CardTitle>
                <CardDescription>
                  {ingredientsSaved ? 'Analysis completed and saved' : 'Analyze ingredients and group by category'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
          <Button
            onClick={loadDetailedIngredients}
            disabled={loadingDetailedIngredients}
            variant="outline"
            className="w-full"
          >
            {loadingDetailedIngredients ? (
              <ChefHat className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <List className="w-4 h-4 mr-2" />
            )}
            {loadingDetailedIngredients ? 'Analyzing...' : 'Detailed Ingredient List'}
          </Button>
                  
                  {ingredientsSaved && (
                    <Button
                      onClick={reanalyzeIngredients}
                      disabled={loadingDetailedIngredients}
                      variant="secondary"
                      className="w-full"
                    >
                      {loadingDetailedIngredients ? (
                        <ChefHat className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <List className="w-4 h-4 mr-2" />
                      )}
                      {loadingDetailedIngredients ? 'Reanalyzing...' : 'Reanalyze'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Ingredients Results */}
            {showDetailedIngredients && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Detailed Ingredient List</span>
                  </CardTitle>
                  <CardDescription>
                    Ingredients found in database, organized by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Matched ingredients by category */}
                    {Object.entries(detailedIngredients).map(([categoryName, ingredients]) => (
                      <div key={categoryName} className="space-y-3">
                        <h4 className="font-semibold text-lg text-gray-900 border-b-2 border-orange-200 pb-2">
                          {categoryName}
                        </h4>
                        <div className="space-y-2">
                          {ingredients.map((ingredient, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{ingredient.name}</span>
                                <div className="text-sm text-gray-600">
                                  Found in: "{ingredient.original_text}"
                                </div>
                                {ingredient.matched_term && (
                                  <div className="text-xs text-blue-600">
                                    Matched term: "{ingredient.matched_term}"
                                  </div>
                                )}
                                {ingredient.matched_alias && (
                                  <div className="text-xs text-purple-600">
                                    Via alias: "{ingredient.matched_alias}"
                                  </div>
                                )}
                              </div>
                              <Badge className={getMatchTypeColor(ingredient.match_type)}>
                                {getMatchTypeLabel(ingredient.match_type)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Unmatched ingredients */}
                    {unmatchedIngredients.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg text-gray-900 border-b-2 border-orange-200 pb-2 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                          Not Found in Database
                        </h4>
                        <div className="space-y-2">
                          {unmatchedIngredients.map((ingredient, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-gray-700">{ingredient}</span>
                              </div>
                              <Badge variant="outline" className="text-orange-600 border-orange-300">
                                Not Found
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Save Button */}
                  {!ingredientsSaved && Object.keys(detailedIngredients).length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        onClick={saveDetailedIngredients}
                        disabled={savingIngredients}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {savingIngredients ? 'Saving...' : '+ADD to Recipe'}
                      </Button>
                    </div>
                  )}
                  
                  {/* Saved Indicator */}
                  {ingredientsSaved && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-center text-green-600 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">Ingredients saved to recipe</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Chef Tony */}
            <ChefOuiOui />

            {/* Recipe Timer */}
            <RecipeTimer />

            {/* AI Q&A */}
            {profile?.has_ai_subscription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-orange-500" />
                    <span>Ask Chef AI</span>
                  </CardTitle>
                  <CardDescription>
                    Get cooking tips and answers about this recipe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Ask a question about this recipe..."
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                    />
                    <Button 
                      onClick={askAI} 
                      disabled={!aiQuestion.trim() || aiLoading}
                      className="w-full"
                    >
                      {aiLoading ? 'Thinking...' : 'Ask Question'}
                    </Button>
                  </div>
                  
                  {aiAnswer && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{aiAnswer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Source */}
            {recipe.source_name && (
              <Card>
                <CardHeader>
                  <CardTitle>Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    {recipe.source_url ? (
                      <a 
                        href={recipe.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-500"
                      >
                        {recipe.source_name}
                      </a>
                    ) : (
                      recipe.source_name
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Global Cookbook Confirmation Dialog */}
      {showGlobalCookbookDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Add to Global Cookbook</h3>
            </div>
            
            {!ingredientsSaved ? (
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900">Detailed Ingredients Required</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        This recipe must have detailed ingredients analyzed before it can be submitted to the Global Cookbook. 
                        Please run the "Detailed Ingredient List" analysis first.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                Do you want to submit this recipe for review to be added to the Global Cookbook? It will be reviewed by moderators before being published.
              </p>
            )}
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowGlobalCookbookDialog(false)}
                disabled={addingToGlobalCookbook}
              >
                Cancel
              </Button>
              <Button
                onClick={addToGlobalCookbook}
                disabled={addingToGlobalCookbook}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {addingToGlobalCookbook ? (
                  <>
                    <ChefHat className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Yes, Submit for Review
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
