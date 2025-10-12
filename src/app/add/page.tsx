'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { ChefHat, Globe, Plus, Upload, FileText, Link, Loader2 } from 'lucide-react'
import PaprikaUploader from '@/components/import/PaprikaUploader'
import { logEventAndAward } from '@/lib/badges'
import { useBadgeToast } from '@/components/badges/BadgeToast'

export default function AddRecipePage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importedRecipe, setImportedRecipe] = useState<{
    recipe: {
      name: string;
      description?: string;
      image?: string | string[];
      prepTime?: string;
      cookTime?: string;
      totalTime?: string;
      recipeYield?: string;
      author?: { name: string };
      source?: string;
      url?: string;
      recipeCategory?: string;
      recipeIngredient?: string[];
      recipeInstructions?: string | Array<{ text: string }> | string[];
    };
    confidence: number;
    source: string;
  } | null>(null)
  const router = useRouter()
  const { showBadgeAwards } = useBadgeToast()

  const handleImportFromWeb = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const response = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to import recipe')
        return
      }

      // Instead of showing preview, save and redirect to edit page immediately
      await saveAndRedirectToEdit(data)
    } catch (err) {
      console.error('Error in import flow:', err)
      setError(err instanceof Error ? err.message : 'Failed to import recipe')
      setLoading(false)
    }
  }




  const matchMealType = async (recipeCategory?: any, recipeCuisine?: any): Promise<number | null> => {
    if (!recipeCategory && !recipeCuisine) return null
    
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
    if (!searchTerm) return null
    
    console.log('Matching meal type for:', searchTerm)
    
    // Try exact match first
    const { data: exactMatch } = await supabase
      .from('meal_types')
      .select('meal_type_id')
      .ilike('name', searchTerm)
      .limit(1)
    
    if (exactMatch && exactMatch.length > 0) {
      console.log('Found exact meal type match:', exactMatch[0].meal_type_id)
      return exactMatch[0].meal_type_id
    }
    
    // Try alias match
    const { data: aliasMatch } = await supabase
      .from('meal_type_aliases')
      .select('meal_type_id')
      .ilike('alias', searchTerm)
      .limit(1)
    
    if (aliasMatch && aliasMatch.length > 0) {
      console.log('Found meal type via alias:', aliasMatch[0].meal_type_id)
      return aliasMatch[0].meal_type_id
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
          return partialMatch[0].meal_type_id
        }
      }
    }
    
    console.log('No meal type match found for:', searchTerm)
    return null
  }

  const saveAndRedirectToEdit = async (importData: any) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const recipe = importData.recipe
      
      // Try to match meal type from recipe category or cuisine
      const mealTypeId = await matchMealType(recipe.recipeCategory, recipe.recipeCuisine)

      // Save the recipe to user_recipes
      const { data: savedRecipe, error: recipeError } = await supabase
        .from('user_recipes')
        .insert({
          user_id: user.id,
          title: recipe.name,
          description: recipe.description,
          image_url: Array.isArray(recipe.image) ? recipe.image[0] : recipe.image,
          prep_time: recipe.prepTime,
          cook_time: recipe.cookTime,
          total_time: recipe.totalTime,
          servings: recipe.recipeYield,
          meal_type_id: mealTypeId,
          source_name: recipe.author?.name || recipe.source,
          source_url: recipe.url,
          diet: recipe.recipeCategory
        })
        .select()
        .single()

      if (recipeError) {
        console.error('Error saving recipe:', recipeError)
        setError('Failed to save recipe')
        return
      }

      // Save ingredients with parsed amount and unit
      if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
        // Ensure recipeIngredient is an array of strings
        let ingredientArray: string[] = []
        
        if (Array.isArray(recipe.recipeIngredient)) {
          ingredientArray = recipe.recipeIngredient
        } else if (typeof recipe.recipeIngredient === 'string') {
          // If it's a single string with newlines, split it
          ingredientArray = recipe.recipeIngredient.split(/[\n\r]+/).filter((line: string) => line.trim())
        }
        
        console.log('Ingredient array for parsing:', ingredientArray)
        console.log('Number of ingredients:', ingredientArray.length)
        
        const { parseIngredients } = await import('@/lib/parseIngredient')
        const parsedIngredients = parseIngredients(ingredientArray)
        
        const ingredients = parsedIngredients.map((parsed) => ({
          user_recipe_id: savedRecipe.user_recipe_id,
          raw_name: parsed.name || parsed.original,
          amount: parsed.amount,
          unit: parsed.unit
        }))

        console.log('Inserting ingredients:', ingredients)
        console.log('Number of ingredients to insert:', ingredients.length)

        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('user_recipe_ingredients')
          .insert(ingredients)
          .select()
        
        if (ingredientsError) {
          console.error('Error inserting ingredients:', ingredientsError)
          console.error('Ingredients that failed to insert:', ingredients)
          throw new Error(`Failed to save ingredients: ${ingredientsError.message}`)
        }
        
        console.log('Successfully inserted ingredients:', insertedIngredients?.length || 0, 'rows')
        console.log('First 3 inserted ingredients:', insertedIngredients?.slice(0, 3))
        console.log('Last 3 inserted ingredients:', insertedIngredients?.slice(-3))

        // Auto-analyze ingredients for detailed matching
        try {
          console.log('Starting ingredient analysis for recipe:', savedRecipe.user_recipe_id)
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
          
          const analyzeResponse = await fetch('/api/ingredients/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_recipe_id: savedRecipe.user_recipe_id }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          if (analyzeResponse.ok) {
            const analyzeResult = await analyzeResponse.json()
            console.log('Auto-analyzed ingredients:', analyzeResult)
            console.log(`Matched: ${analyzeResult.matched_count}, Unmatched: ${analyzeResult.unmatched_count}`)
          } else {
            const errorText = await analyzeResponse.text()
            console.error('Analysis API error:', analyzeResponse.status, errorText)
          }
        } catch (analyzeError) {
          if (analyzeError instanceof Error && analyzeError.name === 'AbortError') {
            console.error('Ingredient analysis timed out after 30 seconds')
          } else {
            console.error('Error auto-analyzing ingredients:', analyzeError)
          }
          // Don't fail the recipe save if analysis fails
        }
      }

      // Save instructions
      if (recipe.recipeInstructions) {
        const instructions = Array.isArray(recipe.recipeInstructions)
          ? recipe.recipeInstructions.map((instruction: string | { text: string }, index: number) => ({
              user_recipe_id: savedRecipe.user_recipe_id,
              step_number: index + 1,
              text: typeof instruction === 'string' ? instruction : instruction.text
            }))
          : [{
              user_recipe_id: savedRecipe.user_recipe_id,
              step_number: 1,
              text: recipe.recipeInstructions
            }]

        await supabase
          .from('user_recipe_steps')
          .insert(instructions)
      }

      // Log badge event for recipe import
      try {
        const instructionsText = Array.isArray(recipe.recipeInstructions)
          ? recipe.recipeInstructions.map((inst: any) => 
              typeof inst === 'string' ? inst : inst.text
            ).join(' ')
          : String(recipe.recipeInstructions || '')
        
        const result = await logEventAndAward(
          'recipe_added',
          {
            name: recipe.name || 'Imported Recipe',
            has_ingredients: Array.isArray(recipe.recipeIngredient) && recipe.recipeIngredient.length > 0,
            instructions_len: instructionsText.length,
            has_photo: !!recipe.image,
            source_url: recipe.url || recipe.source || '',
            imported: true // This is an imported recipe
          },
          savedRecipe.user_recipe_id
        )
        
        if (result?.awards && result.awards.length > 0) {
          showBadgeAwards(result.awards)
        }
      } catch (badgeError) {
        console.error('Error logging badge event:', badgeError)
        // Don't fail recipe import if badge logging fails
      }

      // Small delay to ensure database transaction completes before redirect
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirect to edit page so user can review and make changes
      router.push(`/recipe/${savedRecipe.user_recipe_id}/edit`)
    } catch (error) {
      console.error('Error saving recipe:', error)
      setError('Failed to save recipe')
      setLoading(false)
    }
  }

  const handleSaveRecipe = async () => {
    if (!importedRecipe?.recipe) return
    await saveAndRedirectToEdit(importedRecipe)
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
              <h1 className="text-xl font-bold text-gray-900">Add Recipe</h1>
            </div>
            
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Chef Tony */}
          <div className="flex justify-center lg:justify-start">
            <ChefOuiOui className="lg:sticky lg:top-8" />
          </div>

          {/* Right Panel - Import Form */}
          <div className="space-y-6">
            {/* Import from Web */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <span>Import from Web</span>
                </CardTitle>
                <CardDescription>
                  Paste a URL from any recipe website and we&apos;ll extract the recipe for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!importedRecipe ? (
                  <form onSubmit={handleImportFromWeb} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="url" className="text-sm font-medium">
                        Recipe URL
                      </label>
                      <div className="relative">
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
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing Recipe...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import Recipe
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800">
                          Recipe imported successfully!
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        Confidence: {importedRecipe.confidence} ({importedRecipe.source})
                      </p>
                    </div>

                    {/* Recipe Preview */}
                    <div className="border rounded-lg p-4 bg-white">
                      <h3 className="font-semibold text-lg mb-2">{importedRecipe.recipe.name}</h3>
                      
                      {importedRecipe.recipe.description && (
                        <p className="text-gray-600 mb-3">{importedRecipe.recipe.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        {importedRecipe.recipe.prepTime && (
                          <div>
                            <span className="font-medium">Prep:</span> {importedRecipe.recipe.prepTime}
                          </div>
                        )}
                        {importedRecipe.recipe.cookTime && (
                          <div>
                            <span className="font-medium">Cook:</span> {importedRecipe.recipe.cookTime}
                          </div>
                        )}
                        {importedRecipe.recipe.totalTime && (
                          <div>
                            <span className="font-medium">Total:</span> {importedRecipe.recipe.totalTime}
                          </div>
                        )}
                        {importedRecipe.recipe.recipeYield && (
                          <div>
                            <span className="font-medium">Servings:</span> {importedRecipe.recipe.recipeYield}
                          </div>
                        )}
                      </div>

                      {importedRecipe.recipe.recipeIngredient && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Ingredients ({importedRecipe.recipe.recipeIngredient.length})</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {importedRecipe.recipe.recipeIngredient.slice(0, 3).map((ingredient: string, index: number) => (
                              <li key={index}>• {ingredient}</li>
                            ))}
                            {importedRecipe.recipe.recipeIngredient.length > 3 && (
                              <li className="text-gray-500">... and {importedRecipe.recipe.recipeIngredient.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button onClick={handleSaveRecipe} disabled={loading} className="flex-1">
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Save to Cookbook
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setImportedRecipe(null)
                            setUrl('')
                            setError('')
                          }}
                        >
                          Import Another
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import from Paprika */}
            <PaprikaUploader />

            {/* Manual Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span>Create Manually</span>
                </CardTitle>
                <CardDescription>
                  Enter your recipe details manually
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/add/manual')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create New Recipe
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">💡 Import Tips</h3>
                <ul className="text-orange-100 space-y-1 text-sm">
                  <li>• <strong>Web Import:</strong> Works with most recipe websites (AllRecipes, Food Network, etc.)</li>
                  <li>• <strong>Paprika Import:</strong> Export recipes from Paprika App as .paprikarecipes files</li>
                  <li>• <strong>Manual Entry:</strong> Create recipes from scratch with our form</li>
                  <li>• <strong>All methods:</strong> You can always edit recipes after importing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
