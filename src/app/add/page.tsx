'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefOuiOui } from '@/components/chef-ouioui'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { ChefHat, Globe, Plus, Upload, FileText, Link, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PaprikaUploader from '@/components/import/PaprikaUploader'

export default function AddRecipePage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importedRecipe, setImportedRecipe] = useState<any>(null)
  const router = useRouter()

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
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to import recipe')
        return
      }

      setImportedRecipe(data)
    } catch (err) {
      setError('Failed to import recipe')
    } finally {
      setLoading(false)
    }
  }




  const handleSaveRecipe = async () => {
    if (!importedRecipe?.recipe) return

    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user) return

      const recipe = importedRecipe.recipe

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

      // Save ingredients
      if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
        const ingredients = recipe.recipeIngredient.map((ingredient: string) => ({
          user_recipe_id: savedRecipe.user_recipe_id,
          raw_name: ingredient,
          amount: '',
          unit: ''
        }))

        await supabase
          .from('user_recipe_ingredients')
          .insert(ingredients)
      }

      // Save instructions
      if (recipe.recipeInstructions) {
        const instructions = Array.isArray(recipe.recipeInstructions)
          ? recipe.recipeInstructions.map((instruction: any, index: number) => ({
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

      router.push(`/recipe/${savedRecipe.user_recipe_id}`)
    } catch (err) {
      console.error('Error saving recipe:', err)
      setError('Failed to save recipe')
    } finally {
      setLoading(false)
    }
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
          {/* Left Panel - Chef OuiOui */}
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
                  Paste a URL from any recipe website and we'll extract the recipe for you
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
