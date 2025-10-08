'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, Minus, ChefHat, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'

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
  cuisine_id?: number
  meal_type_id?: number
  source_name?: string
  source_url?: string
  is_published: boolean
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

export default function EditGlobalRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [editedRecipe, setEditedRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [cuisines, setCuisines] = useState<any[]>([])
  const [mealTypes, setMealTypes] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params
      await checkAuth()
      await loadRecipe(resolvedParams.id)
      await loadReferenceData()
    }
    initializePage()
  }, [params])

  const checkAuth = async () => {
    try {
      console.log('Checking authentication for global recipe edit...')
      const currentUser = await getCurrentUser()
      console.log('Current user:', currentUser)
      
      if (!currentUser) {
        console.log('No user found, redirecting to signin')
        router.push('/auth/signin')
        return
      }

      const currentProfile = await getCurrentProfile()
      console.log('Current profile:', currentProfile)
      
      if (!currentProfile) {
        console.log('No profile found, redirecting to signin')
        router.push('/auth/signin')
        return
      }

      const isAdminUser = isAdmin(currentProfile)
      console.log('Is admin:', isAdminUser, 'Role:', currentProfile.role)

      if (!isAdminUser) {
        console.log('User is not admin, redirecting to home')
        router.push('/')
        return
      }

      setUser(currentUser)
      setProfile(currentProfile)
      setAuthLoading(false)
      console.log('Authentication successful, user is admin')
    } catch (error) {
      console.error('Error checking auth:', error)
      setAuthLoading(false)
      router.push('/auth/signin')
    }
  }

  const loadRecipe = async (recipeId: string) => {
    try {
      console.log('Loading global recipe for edit with ID:', recipeId)
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
        .single()

      if (recipeError) {
        console.error('Error loading recipe:', recipeError)
        setError('Recipe not found')
        return
      }

      // Load ingredients and convert to text strings
      console.log('Loading ingredients for global recipe ID:', recipeId)
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('global_recipe_ingredients')
        .select('amount, unit, raw_name')
        .eq('recipe_id', recipeId)

      console.log('Global ingredients query result:', { ingredientsData, ingredientsError })

      // Convert structured ingredients to text strings
      const ingredientTexts = ingredientsData?.map(ing => {
        const fullText = `${ing.amount || ''}${ing.unit ? ` ${ing.unit}` : ''} ${ing.raw_name || ''}`.trim()
        return fullText
      }).filter(text => text.length > 0) || []

      console.log('Converted ingredient texts:', ingredientTexts)

      // Remove duplicates and split ingredients that contain newlines into separate items
      const uniqueIngredientTexts = [...new Set(ingredientTexts)]
      console.log('Unique ingredient texts:', uniqueIngredientTexts)
      
      const splitIngredientTexts = uniqueIngredientTexts.flatMap(text => 
        text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      )

      console.log('Split ingredient texts:', splitIngredientTexts)

      // Load steps
      const { data: stepsData } = await supabase
        .from('global_recipe_steps')
        .select('step_number, text')
        .eq('recipe_id', recipeId)
        .order('step_number')

      // Split steps by paragraphs (same logic as recipe detail page)
      const splitSteps = stepsData?.flatMap((step, stepIndex) =>
        step.text.split('\n')
          .filter(paragraph => paragraph.trim()) // Remove empty paragraphs
          .map((paragraph, paragraphIndex) => ({
            step_number: stepIndex + 1,
            text: paragraph.trim()
          }))
      ) || []

      console.log('Split steps:', splitSteps)

      // Load equipment
      const { data: equipmentData } = await supabase
        .from('global_recipe_equipment')
        .select('equipment:equipment(name)')
        .eq('recipe_id', recipeId)

      // Load tags
      const { data: tagsData } = await supabase
        .from('global_recipe_tags')
        .select('tag:tags(name)')
        .eq('recipe_id', recipeId)

      const fullRecipe = {
        ...recipeData,
        ingredients: splitIngredientTexts,
        steps: splitSteps,
        equipment: equipmentData || [],
        tags: tagsData || []
      }

      setRecipe(fullRecipe)
      setEditedRecipe({
        ...fullRecipe,
        ingredients: splitIngredientTexts.length > 0 ? splitIngredientTexts : [''],
        steps: splitSteps.length > 0 ? splitSteps : [{ step_number: 1, text: '' }],
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
      ingredients: [...editedRecipe.ingredients, '']
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

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...editedRecipe.ingredients]
    newIngredients[index] = value
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

      const resolvedParams = await params
      const recipeId = resolvedParams.id

      // Validate required fields
      if (!editedRecipe.title?.trim()) {
        setError('Recipe title is required')
        return
      }

      if (editedRecipe.ingredients.some((ing: any) => !ing?.trim())) {
        setError('All ingredients in "What You Will Need" must have text')
        return
      }

      if (editedRecipe.steps.some((step: any) => !step.text?.trim())) {
        setError('All steps must have text')
        return
      }

      // Check if we have any ingredients or steps to save
      if (editedRecipe.ingredients.length === 0) {
        setError('At least one ingredient is required')
        return
      }

      if (editedRecipe.steps.length === 0) {
        setError('At least one step is required')
        return
      }

      // Update recipe
      const { error: recipeError } = await supabase
        .from('global_recipes')
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
        .eq('recipe_id', recipeId)

      if (recipeError) {
        throw new Error('Failed to update recipe')
      }

      // Only update ingredients if they have changed
      if (editedRecipe.ingredients.length > 0) {
        // Save ingredients as a single combined text string (like the original format)
        const combinedIngredients = editedRecipe.ingredients.join('\n')
        console.log('Saving global ingredients:', { 
          count: editedRecipe.ingredients.length, 
          combined: combinedIngredients 
        })

        // First, delete existing ingredients
        const { error: deleteError } = await supabase
          .from('global_recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId)

        if (deleteError) {
          console.error('Error deleting existing ingredients:', deleteError)
          throw new Error('Failed to delete existing ingredients')
        }

        // Then insert new ingredients
        const ingredients = [{
          recipe_id: parseInt(recipeId),
          amount: null,
          unit: null,
          raw_name: combinedIngredients
        }]

        const { error: ingredientsError } = await supabase
          .from('global_recipe_ingredients')
          .insert(ingredients)
        
        if (ingredientsError) {
          console.error('Error saving ingredients:', ingredientsError)
          throw new Error('Failed to save ingredients')
        } else {
          console.log('Global ingredients saved successfully')
        }
      }

      // Only update steps if they have changed
      if (editedRecipe.steps.length > 0) {
        console.log('Saving global steps:', { count: editedRecipe.steps.length })

        // First, delete existing steps
        const { error: deleteStepsError } = await supabase
          .from('global_recipe_steps')
          .delete()
          .eq('recipe_id', recipeId)

        if (deleteStepsError) {
          console.error('Error deleting existing steps:', deleteStepsError)
          throw new Error('Failed to delete existing steps')
        }

        // Then insert new steps
        const steps = editedRecipe.steps.map((step: any, index: number) => ({
          recipe_id: parseInt(recipeId),
          step_number: index + 1,
          text: step.text
        }))

        const { error: stepsError } = await supabase
          .from('global_recipe_steps')
          .insert(steps)

        if (stepsError) {
          console.error('Error saving steps:', stepsError)
          throw new Error('Failed to save steps')
        } else {
          console.log('Global steps saved successfully')
        }
      }

      // Update tags (delete existing and add new)
      await supabase
        .from('global_recipe_tags')
        .delete()
        .eq('recipe_id', recipeId)

      if (editedRecipe.tags.length > 0) {
        const tags = editedRecipe.tags.map((tagObj: any) => ({
          recipe_id: parseInt(recipeId),
          tag_name: tagObj.tag.name
        }))

        await supabase
          .from('global_recipe_tags')
          .insert(tags)
      }

      // Redirect to global recipe page
      router.push(`/global-recipe/${recipeId}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-orange-700">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
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
            <Button onClick={() => router.push('/admin/global-recipes/edit')}>
              Back to Global Recipes
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!recipe || !editedRecipe) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              variant="outline"
              onClick={async () => {
                const resolvedParams = await params
                router.push(`/global-recipe/${resolvedParams.id}`)
              }}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Recipe
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-900 flex items-center">
                <ChefHat className="w-8 h-8 mr-3" />
                Edit Global Recipe
              </h1>
              <p className="text-orange-700 mt-2">
                Update global recipe details
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
                    Update global recipe details
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
                  <CardTitle>What You Will Need</CardTitle>
                  <CardDescription>
                    Update global recipe ingredients list (this is the text that appears in the recipe)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editedRecipe.ingredients.map((ingredient: string, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex-1">
                        <Input
                          placeholder="e.g., '2 cups all-purpose flour, sifted' or '1 large onion, diced'"
                          value={ingredient || ''}
                          onChange={(e) => updateIngredient(index, e.target.value)}
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
                    Update cooking instructions
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
    </div>
  )
}
