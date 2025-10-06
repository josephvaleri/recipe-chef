'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
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
  Timer
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

export default function RecipePage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scaleFactor, setScaleFactor] = useState(1)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    loadRecipe()
    loadProfile()
  }, [params.id])

  const loadRecipe = async () => {
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
        .eq('user_recipe_id', params.id)
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
        .eq('user_recipe_id', params.id)

      // Load steps
      const { data: stepsData } = await supabase
        .from('user_recipe_steps')
        .select('step_number, text')
        .eq('user_recipe_id', params.id)
        .order('step_number')

      // Load equipment
      const { data: equipmentData } = await supabase
        .from('user_recipe_equipment')
        .select('equipment:equipment(name)')
        .eq('user_recipe_id', params.id)

      // Load tags
      const { data: tagsData } = await supabase
        .from('user_recipe_tags')
        .select('tag:tags(name)')
        .eq('user_recipe_id', params.id)

      // Load rating
      const { data: ratingData } = await supabase
        .from('ratings')
        .select('score')
        .eq('user_id', user.id)
        .eq('recipe_scope', 'user')
        .eq('recipe_key', params.id)
        .single()

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
      const { error } = await supabase
        .from('user_recipes')
        .delete()
        .eq('user_recipe_id', recipe.user_recipe_id)

      if (error) {
        console.error('Error deleting recipe:', error)
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
                    {recipe.description && (
                      <p className="text-gray-600">{recipe.description}</p>
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
                          <Star className={`w-5 h-5 ${star <= (recipe.rating || 0) ? 'fill-current text-yellow-500' : ''}`} />
                        </button>
                      ))}
                    </div>
                    {recipe.rating > 0 && (
                      <span className="text-sm text-gray-500">({recipe.rating}/5)</span>
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

            {/* Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>
                  {recipe.ingredients.length} ingredients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <span className="font-medium text-orange-600">
                          {ingredient.amount ? scaleAmount(ingredient.amount, scaleFactor) : ''}
                          {ingredient.unit && ` ${ingredient.unit}`}
                        </span>
                        <span className="text-gray-900 ml-2">
                          {ingredient.raw_name || ingredient.ingredient?.name}
                        </span>
                      </div>
                    </li>
                  ))}
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
                <ol className="space-y-4">
                  {recipe.steps.map((step) => (
                    <li key={step.step_number} className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 leading-relaxed">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Chef OuiOui */}
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
    </div>
  )
}
