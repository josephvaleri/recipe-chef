'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Plus, Minus, ChefHat, Loader2, Globe, Upload, Link } from 'lucide-react'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface Ingredient {
  ingredient_id: number
  amount: string
  unit: string
}

interface Step {
  step_number: number
  text: string
}

export default function AddGlobalRecipePage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [cuisines, setCuisines] = useState<{ cuisine_id: number; name: string }[]>([])
  const [mealTypes, setMealTypes] = useState<{ meal_type_id: number; name: string }[]>([])
  const [ingredients, setIngredients] = useState<{ ingredient_id: number; name: string }[]>([])
  const router = useRouter()
  
  // URL Import state
  const [url, setUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importedRecipe, setImportedRecipe] = useState<any>(null)

  const [recipe, setRecipe] = useState({
    title: '',
    description: '',
    prep_time: '',
    cook_time: '',
    total_time: '',
    servings: '',
    difficulty: 'Easy',
    image_url: '',
    cuisine_id: '',
    meal_type_id: '',
    source_name: '',
    source_url: ''
  })

  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([])
  const [recipeSteps, setRecipeSteps] = useState<Step[]>([])

  const checkAuth = useCallback(async () => {
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
      await loadReferenceData()
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/auth/signin')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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

      // Load ingredients
      const { data: ingredientsData } = await supabase
        .from('ingredients')
        .select('*')
        .order('name')

      setCuisines(cuisinesData || [])
      setMealTypes(mealTypesData || [])
      setIngredients(ingredientsData || [])
    } catch (error) {
      console.error('Error loading reference data:', error)
    }
  }

  const matchMealType = async (recipeCategory?: any, recipeCuisine?: any): Promise<string> => {
    if (!recipeCategory && !recipeCuisine) return ''
    
    // Convert to string if it's an array or object
    let categoryStr = ''
    if (typeof recipeCategory === 'string') {
      categoryStr = recipeCategory
    } else if (Array.isArray(recipeCategory)) {
      categoryStr = recipeCategory.join(' ')
    } else if (typeof recipeCategory === 'object' && recipeCategory !== null) {
      categoryStr = recipeCategory.name || recipeCategory.value || ''
    }
    
    let cuisineStr = ''
    if (typeof recipeCuisine === 'string') {
      cuisineStr = recipeCuisine
    } else if (Array.isArray(recipeCuisine)) {
      cuisineStr = recipeCuisine.join(' ')
    } else if (typeof recipeCuisine === 'object' && recipeCuisine !== null) {
      cuisineStr = recipeCuisine.name || recipeCuisine.value || ''
    }
    
    const searchTerm = (categoryStr || cuisineStr || '').toLowerCase().trim()
    if (!searchTerm) return ''
    
    console.log('Matching meal type for:', searchTerm)
    
    // Try exact match first
    const { data: exactMatch } = await supabase
      .from('meal_types')
      .select('meal_type_id')
      .ilike('name', searchTerm)
      .limit(1)
    
    if (exactMatch && exactMatch.length > 0) {
      console.log('Found exact meal type match:', exactMatch[0].meal_type_id)
      return String(exactMatch[0].meal_type_id)
    }
    
    // Try alias match
    const { data: aliasMatch } = await supabase
      .from('meal_type_aliases')
      .select('meal_type_id')
      .ilike('alias', searchTerm)
      .limit(1)
    
    if (aliasMatch && aliasMatch.length > 0) {
      console.log('Found meal type via alias:', aliasMatch[0].meal_type_id)
      return String(aliasMatch[0].meal_type_id)
    }
    
    // Try partial matches for common patterns
    const mealTypeMap: { [key: string]: string } = {
      'main': 'Entrée',
      'entree': 'Entrée',
      'entrée': 'Entrée',
      'course': 'Entrée',
      'appetizer': 'Appetizer',
      'starter': 'Appetizer',
      'dessert': 'Dessert',
      'sweet': 'Dessert',
      'soup': 'Soup',
      'salad': 'Salad',
      'side': 'Side Dish',
      'breakfast': 'Breakfast',
      'brunch': 'Breakfast',
      'lunch': 'Lunch',
      'dinner': 'Dinner',
      'snack': 'Snack',
      'drink': 'Beverage',
      'cocktail': 'Beverage'
    }
    
    for (const [keyword, mealType] of Object.entries(mealTypeMap)) {
      if (searchTerm.includes(keyword)) {
        const { data: partialMatch } = await supabase
          .from('meal_types')
          .select('meal_type_id')
          .ilike('name', mealType)
          .limit(1)
        
        if (partialMatch && partialMatch.length > 0) {
          console.log(`Found meal type via keyword "${keyword}":`, partialMatch[0].meal_type_id)
          return String(partialMatch[0].meal_type_id)
        }
      }
    }
    
    console.log('No meal type match found for:', searchTerm)
    return ''
  }

  const handleImportFromWeb = async (e: React.FormEvent) => {
    e.preventDefault()
    setImporting(true)
    setImportError('')

    try {
      const response = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setImportError(data.error || 'Failed to import recipe')
        return
      }

      // Store the imported recipe data
      setImportedRecipe(data.recipe)
      
      // Populate the form with imported data
      const importedData = data.recipe
      
      // Try to auto-match meal type
      const matchedMealTypeId = await matchMealType(importedData.recipeCategory, importedData.recipeCuisine)
      
      console.log('Imported recipe data:', {
        name: importedData.name,
        prepTime: importedData.prepTime,
        cookTime: importedData.cookTime,
        totalTime: importedData.totalTime,
        recipeYield: importedData.recipeYield,
        recipeCategory: importedData.recipeCategory,
        matchedMealTypeId
      })
      
      setRecipe({
        title: importedData.name || '',
        description: importedData.description || '',
        prep_time: importedData.prepTime || '',
        cook_time: importedData.cookTime || '',
        total_time: importedData.totalTime || '',
        servings: importedData.recipeYield || '',
        difficulty: 'Easy',
        image_url: Array.isArray(importedData.image) ? importedData.image[0] : (importedData.image || ''),
        cuisine_id: '',
        meal_type_id: matchedMealTypeId,
        source_name: importedData.author?.name || importedData.source || 'Web Import',
        source_url: url
      })

      // Set steps
      if (importedData.recipeInstructions) {
        const instructions = Array.isArray(importedData.recipeInstructions)
          ? importedData.recipeInstructions
          : [importedData.recipeInstructions]
        
        const steps = instructions.map((text: string, index: number) => ({
          step_number: index + 1,
          text: text
        }))
        
        setRecipeSteps(steps)
      }

      // Show success message with ingredient count
      const ingredientCount = importedData.recipeIngredient?.length || 0
      const stepCount = Array.isArray(importedData.recipeInstructions) ? importedData.recipeInstructions.length : 1
      alert(`Recipe "${importedData.name}" imported successfully!\n\n${ingredientCount} ingredients and ${stepCount} steps loaded.\n\nPlease review and select cuisine/meal type, then click Save.`)
      
      // Clear URL
      setUrl('')
    } catch (err) {
      console.error('Error in import flow:', err)
      setImportError(err instanceof Error ? err.message : 'Failed to import recipe')
    } finally {
      setImporting(false)
    }
  }

  const addIngredient = () => {
    setRecipeIngredients(prev => [...prev, {
      ingredient_id: 0,
      amount: '',
      unit: ''
    }])
  }

  const removeIngredient = (index: number) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setRecipeIngredients(prev => prev.map((ing, i) => 
      i === index ? { ...ing, [field]: value } : ing
    ))
  }

  const addStep = () => {
    setRecipeSteps(prev => [...prev, {
      step_number: prev.length + 1,
      text: ''
    }])
  }

  const removeStep = (index: number) => {
    setRecipeSteps(prev => prev.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, text: string) => {
    setRecipeSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, text } : step
    ))
  }

  const handleSave = async () => {
    if (!recipe.title.trim()) {
      alert('Please enter a recipe title')
      return
    }

    setIsSaving(true)
    try {
      // Insert global recipe
      const { data: globalRecipe, error: recipeError } = await supabase
        .from('global_recipes')
        .insert({
          title: recipe.title,
          description: recipe.description,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          total_time: recipe.total_time,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          image_url: recipe.image_url,
          cuisine_id: recipe.cuisine_id ? parseInt(recipe.cuisine_id) : null,
          meal_type_id: recipe.meal_type_id ? parseInt(recipe.meal_type_id) : null,
          source_name: recipe.source_name || null,
          source_url: recipe.source_url || null,
          created_by: user?.id || null,
          is_published: true,
          added_count: 0
        })
        .select()
        .single()

      if (recipeError) {
        console.error('Error inserting recipe:', recipeError)
        alert('Failed to save recipe')
        return
      }

      // Insert ingredients
      // Check if we have raw ingredient text from import
      const hasRawIngredients = recipe.source_url && importedRecipe?.recipeIngredient
      
      if (hasRawIngredients) {
        // Parse imported ingredients to extract amount, unit, and name
        const { parseIngredients } = await import('@/lib/parseIngredient')
        const parsedIngredients = parseIngredients(importedRecipe.recipeIngredient)
        
        const rawIngredients = parsedIngredients.map((parsed) => ({
          recipe_id: globalRecipe.recipe_id,
          raw_name: parsed.name || parsed.original,
          amount: parsed.amount,
          unit: parsed.unit,
          ingredient_id: null
        }))
        
        if (rawIngredients.length > 0) {
          await supabase
            .from('global_recipe_ingredients')
            .insert(rawIngredients)
          
          console.log(`Saved ${rawIngredients.length} ingredients with parsed amount/unit for scaling`)
        }
      } else if (recipeIngredients.length > 0) {
        // Save manually entered ingredients
        const ingredients = recipeIngredients
          .filter(ing => ing.ingredient_id > 0)
          .map(ing => ({
            recipe_id: globalRecipe.recipe_id,
            ingredient_id: ing.ingredient_id,
            amount: ing.amount,
            unit: ing.unit
          }))

        if (ingredients.length > 0) {
          await supabase
            .from('global_recipe_ingredients')
            .insert(ingredients)
        }
      }

      // Insert steps
      if (recipeSteps.length > 0) {
        const steps = recipeSteps
          .filter(step => step.text.trim())
          .map((step, index) => ({
            recipe_id: globalRecipe.recipe_id,
            step_number: index + 1,
            text: step.text
          }))

        if (steps.length > 0) {
          await supabase
            .from('global_recipe_steps')
            .insert(steps)
        }
      }

      // Auto-analyze ingredients if we imported from URL
      if (hasRawIngredients) {
        try {
          console.log('Starting ingredient analysis for global recipe:', globalRecipe.recipe_id)
          
          // Note: We'll need to create an analyze endpoint for global recipes
          // For now, admin can manually run analysis from the recipe page
          console.log('Ingredient analysis will need to be run manually from the recipe page')
          
        } catch (analyzeError) {
          console.error('Error auto-analyzing ingredients:', analyzeError)
          // Don't fail the recipe save if analysis fails
        }
      }

      alert('Recipe saved successfully!')
      // Redirect to the global recipe edit page for final review
      router.push(`/global-recipe/${globalRecipe.recipe_id}/edit`)
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Failed to save recipe')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-pulse" />
          <p className="text-orange-700">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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
              <h1 className="text-3xl font-bold text-orange-900">Add Global Recipe</h1>
              <p className="text-orange-700">Create a new recipe for the global cookbook</p>
            </div>
          </div>

          {/* URL Import Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-orange-500" />
                <span>Import from Web</span>
              </CardTitle>
              <CardDescription>
                Paste a URL from any recipe website to auto-populate the form below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleImportFromWeb} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium">
                    Recipe URL
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://example.com/recipe"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={importing} className="bg-orange-600 hover:bg-orange-700">
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {importError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    {importError}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recipe Details */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
              <CardHeader>
                <CardTitle>Recipe Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <Input
                    value={recipe.title}
                    onChange={(e) => setRecipe(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Recipe title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Textarea
                    value={recipe.description}
                    onChange={(e) => setRecipe(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Recipe description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time</label>
                    <Input
                      value={recipe.prep_time}
                      onChange={(e) => setRecipe(prev => ({ ...prev, prep_time: e.target.value }))}
                      placeholder="PT30M"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time</label>
                    <Input
                      value={recipe.cook_time}
                      onChange={(e) => setRecipe(prev => ({ ...prev, cook_time: e.target.value }))}
                      placeholder="PT1H"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                    <Input
                      value={recipe.servings}
                      onChange={(e) => setRecipe(prev => ({ ...prev, servings: e.target.value }))}
                      placeholder="4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select
                      value={recipe.difficulty}
                      onChange={(e) => setRecipe(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Very Hard">Very Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <Input
                    value={recipe.image_url}
                    onChange={(e) => setRecipe(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
                    <Input
                      value={recipe.source_name}
                      onChange={(e) => setRecipe(prev => ({ ...prev, source_name: e.target.value }))}
                      placeholder="e.g., AllRecipes, Food Network"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
                    <Input
                      value={recipe.source_url}
                      onChange={(e) => setRecipe(prev => ({ ...prev, source_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                    <select
                      value={recipe.cuisine_id}
                      onChange={(e) => setRecipe(prev => ({ ...prev, cuisine_id: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select Cuisine</option>
                      {cuisines.map(cuisine => (
                        <option key={cuisine.cuisine_id} value={cuisine.cuisine_id}>
                          {cuisine.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
                    <select
                      value={recipe.meal_type_id}
                      onChange={(e) => setRecipe(prev => ({ ...prev, meal_type_id: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select Meal Type</option>
                      {mealTypes.map(mealType => (
                        <option key={mealType.meal_type_id} value={mealType.meal_type_id}>
                          {mealType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ingredients & Steps */}
            <div className="space-y-6">
              {/* Ingredients */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Ingredients</span>
                    <Button onClick={addIngredient} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recipeIngredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={ingredient.ingredient_id}
                        onChange={(e) => updateIngredient(index, 'ingredient_id', parseInt(e.target.value))}
                        className="flex-1 border rounded-md px-3 py-2 text-sm"
                      >
                        <option value={0}>Select Ingredient</option>
                        {ingredients.map(ing => (
                          <option key={ing.ingredient_id} value={ing.ingredient_id}>
                            {ing.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={ingredient.amount}
                        onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        className="w-24"
                      />
                      <Input
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="w-24"
                      />
                      <Button
                        onClick={() => removeIngredient(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Steps */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Steps</span>
                    <Button onClick={addStep} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recipeSteps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <Textarea
                        value={step.text}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder="Step instructions"
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => removeStep(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 mt-1"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save Recipe'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

