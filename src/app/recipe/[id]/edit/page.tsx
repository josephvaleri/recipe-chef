'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/route-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, Minus, ChefHat, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

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
  cuisine_id?: number
  meal_type_id?: number
  source_name?: string
  source_url?: string
  is_favorite: boolean
  ingredients: Array<{
    amount?: string
    unit?: string
    raw_name?: string
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
}

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [editedRecipe, setEditedRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cuisines, setCuisines] = useState<any[]>([])
  const [mealTypes, setMealTypes] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    loadRecipe()
    loadReferenceData()
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
        .select('amount, unit, raw_name')
        .eq('user_recipe_id', params.id)
        .order('order_index')

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

      const fullRecipe = {
        ...recipeData,
        ingredients: ingredientsData || [],
        steps: stepsData || [],
        equipment: equipmentData || [],
        tags: tagsData || []
      }

      setRecipe(fullRecipe)
      setEditedRecipe({
        ...fullRecipe,
        ingredients: ingredientsData || [{ amount: '', unit: '', raw_name: '' }],
        steps: stepsData || [{ step_number: 1, text: '' }],
        newTags: []
      })
    } catch (error) {
      console.error('Error loading recipe:', error)
      setError('Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }

  const loadReferenceData = async () => {
    try {
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

      // Load available tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .order('name')

      setCuisines(cuisinesData || [])
      setMealTypes(mealTypesData || [])
      setAvailableTags(tagsData || [])
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const addIngredient = () => {
    setEditedRecipe({
      ...editedRecipe,
      ingredients: [...editedRecipe.ingredients, { amount: '', unit: '', raw_name: '' }]
    })
  }

  const removeIngredient = (index: number) => {
    if (editedRecipe.ingredients.length > 1) {
      setEditedRecipe({
        ...editedRecipe,
        ingredients: editedRecipe.ingredients.filter((_: any, i: number) => i !== index)
      })
    }
  }

  const updateIngredient = (index: number, field: string, value: string) => {
    const newIngredients = [...editedRecipe.ingredients]
    newIngredients[index][field] = value
    setEditedRecipe({
      ...editedRecipe,
      ingredients: newIngredients
    })
  }

  const addStep = () => {
    setEditedRecipe({
      ...editedRecipe,
      steps: [...editedRecipe.steps, { step_number: editedRecipe.steps.length + 1, text: '' }]
    })
  }

  const removeStep = (index: number) => {
    if (editedRecipe.steps.length > 1) {
      const newSteps = editedRecipe.steps.filter((_: any, i: number) => i !== index)
      // Renumber steps
      const renumberedSteps = newSteps.map((step: any, i: number) => ({
        ...step,
        step_number: i + 1
      }))
      setEditedRecipe({
        ...editedRecipe,
        steps: renumberedSteps
      })
    }
  }

  const updateStep = (index: number, text: string) => {
    const newSteps = [...editedRecipe.steps]
    newSteps[index].text = text
    setEditedRecipe({
      ...editedRecipe,
      steps: newSteps
    })
  }

  const addTag = (tagName: string) => {
    if (!tagName.trim()) return
    
    const newTag = { tag: { name: tagName.trim() } }
    setEditedRecipe({
      ...editedRecipe,
      tags: [...editedRecipe.tags, newTag]
    })
  }

  const removeTag = (index: number) => {
    setEditedRecipe({
      ...editedRecipe,
      tags: editedRecipe.tags.filter((_: any, i: number) => i !== index)
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Validate required fields
      if (!editedRecipe.title?.trim()) {
        setError('Recipe title is required')
        return
      }

      if (editedRecipe.ingredients.some((ing: any) => !ing.raw_name?.trim())) {
        setError('All ingredients must have a name')
        return
      }

      if (editedRecipe.steps.some((step: any) => !step.text?.trim())) {
        setError('All steps must have text')
        return
      }

      // Update recipe
      const { error: recipeError } = await supabase
        .from('user_recipes')
        .update({
          title: editedRecipe.title,
          description: editedRecipe.description || null,
          image_url: editedRecipe.image_url || null,
          prep_time: editedRecipe.prep_time || null,
          cook_time: editedRecipe.cook_time || null,
          servings: editedRecipe.servings || null,
          difficulty: editedRecipe.difficulty || 'Easy',
          cuisine_id: editedRecipe.cuisine_id || null,
          meal_type_id: editedRecipe.meal_type_id || null,
          source_name: editedRecipe.source_name || null,
          source_url: editedRecipe.source_url || null
        })
        .eq('user_recipe_id', params.id)

      if (recipeError) {
        throw new Error('Failed to update recipe')
      }

      // Delete existing ingredients and add new ones
      await supabase
        .from('user_recipe_ingredients')
        .delete()
        .eq('user_recipe_id', params.id)

      if (editedRecipe.ingredients.length > 0) {
        const ingredients = editedRecipe.ingredients.map((ing: any, index: number) => ({
          user_recipe_id: parseInt(params.id),
          amount: ing.amount || null,
          unit: ing.unit || null,
          raw_name: ing.raw_name,
          order_index: index + 1
        }))

        await supabase
          .from('user_recipe_ingredients')
          .insert(ingredients)
      }

      // Delete existing steps and add new ones
      await supabase
        .from('user_recipe_steps')
        .delete()
        .eq('user_recipe_id', params.id)

      if (editedRecipe.steps.length > 0) {
        const steps = editedRecipe.steps.map((step: any, index: number) => ({
          user_recipe_id: parseInt(params.id),
          step_number: index + 1,
          text: step.text,
          order_index: index + 1
        }))

        await supabase
          .from('user_recipe_steps')
          .insert(steps)
      }

      // Update tags (delete existing and add new)
      await supabase
        .from('user_recipe_tags')
        .delete()
        .eq('user_recipe_id', params.id)

      if (editedRecipe.tags.length > 0) {
        const tags = editedRecipe.tags.map((tagObj: any) => ({
          user_recipe_id: parseInt(params.id),
          tag_name: tagObj.tag.name
        }))

        await supabase
          .from('user_recipe_tags')
          .insert(tags)
      }

      // Redirect to recipe page
      router.push(`/recipe/${params.id}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-orange-700">Loading recipe...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !recipe) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-orange-900 mb-4">Error</h2>
            <p className="text-orange-700 mb-6">{error}</p>
            <Button onClick={() => router.push('/cookbook')}>
              Back to Cookbook
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!recipe || !editedRecipe) return null

  return (
    <RouteGuard requireAuth={true} className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              variant="outline"
              onClick={() => router.push(`/recipe/${params.id}`)}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Recipe
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-900 flex items-center">
                <ChefHat className="w-8 h-8 mr-3" />
                Edit Recipe
              </h1>
              <p className="text-orange-700 mt-2">
                Update your recipe details
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Recipe Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Update your recipe details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Recipe Title *
                    </label>
                    <Input
                      value={editedRecipe.title || ''}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, title: e.target.value })}
                      className="border-orange-300 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={editedRecipe.description || ''}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, description: e.target.value })}
                      className="border-orange-300 focus:border-orange-500 min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Prep Time
                      </label>
                      <Input
                        value={editedRecipe.prep_time || ''}
                        onChange={(e) => setEditedRecipe({ ...editedRecipe, prep_time: e.target.value })}
                        placeholder="e.g., 15 minutes"
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Cook Time
                      </label>
                      <Input
                        value={editedRecipe.cook_time || ''}
                        onChange={(e) => setEditedRecipe({ ...editedRecipe, cook_time: e.target.value })}
                        placeholder="e.g., 30 minutes"
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Servings
                      </label>
                      <Input
                        value={editedRecipe.servings || ''}
                        onChange={(e) => setEditedRecipe({ ...editedRecipe, servings: e.target.value })}
                        placeholder="e.g., 4"
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Cuisine
                      </label>
                      <select
                        value={editedRecipe.cuisine_id || ''}
                        onChange={(e) => setEditedRecipe({ ...editedRecipe, cuisine_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select cuisine</option>
                        {cuisines.map((cuisine) => (
                          <option key={cuisine.cuisine_id} value={cuisine.cuisine_id}>
                            {cuisine.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Meal Type
                      </label>
                      <select
                        value={editedRecipe.meal_type_id || ''}
                        onChange={(e) => setEditedRecipe({ ...editedRecipe, meal_type_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">Select meal type</option>
                        {mealTypes.map((mealType) => (
                          <option key={mealType.meal_type_id} value={mealType.meal_type_id}>
                            {mealType.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Difficulty
                      </label>
                      <select
                        value={editedRecipe.difficulty || 'Easy'}
                        onChange={(e) => setEditedRecipe({ ...editedRecipe, difficulty: e.target.value })}
                        className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Image URL
                    </label>
                    <Input
                      value={editedRecipe.image_url || ''}
                      onChange={(e) => setEditedRecipe({ ...editedRecipe, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="border-orange-300 focus:border-orange-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Ingredients</CardTitle>
                  <CardDescription>
                    Update your recipe ingredients
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editedRecipe.ingredients.map((ingredient: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          placeholder="Amount"
                          value={ingredient.amount || ''}
                          onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                        <Input
                          placeholder="Unit"
                          value={ingredient.unit || ''}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                        <Input
                          placeholder="Ingredient name *"
                          value={ingredient.raw_name || ''}
                          onChange={(e) => updateIngredient(index, 'raw_name', e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                        disabled={editedRecipe.ingredients.length === 1}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addIngredient}
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ingredient
                  </Button>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Instructions</CardTitle>
                  <CardDescription>
                    Update your cooking instructions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editedRecipe.steps.map((step: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Describe this step..."
                          value={step.text}
                          onChange={(e) => updateStep(index, e.target.value)}
                          className="border-orange-300 focus:border-orange-500 min-h-[80px]"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeStep(index)}
                        disabled={editedRecipe.steps.length === 1}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addStep}
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tags */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>
                    Manage recipe tags
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                      className="border-orange-300 focus:border-orange-500"
                    />
                    <Button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add a tag..."]') as HTMLInputElement
                        if (input?.value) {
                          addTag(input.value)
                          input.value = ''
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {editedRecipe.tags.map((tagObj: any, index: number) => (
                      <Badge
                        key={index}
                        className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer"
                        onClick={() => removeTag(index)}
                      >
                        {tagObj.tag.name} ×
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardContent className="p-6">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-orange-600 hover:bg-orange-700 py-3"
                    size="lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
