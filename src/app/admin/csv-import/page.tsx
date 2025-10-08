'use client'

import { useState, useRef } from 'react'
import { RouteGuard } from '@/components/route-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Download,
  Database,
  ChefHat
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface ImportResult {
  success: number
  errors: number
  total: number
  errorDetails: string[]
}

interface RecipeRow {
  title: string
  description?: string
  ingredients: string
  instructions: string
  prep_time?: string
  cook_time?: string
  servings?: string
  difficulty?: string
  cuisine?: string
  meal_type?: string
  image_url?: string
  source_name?: string
  source_url?: string
  diet?: string
}

export default function CSVImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setIsUploading(true)
    setError('')
    setImportResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length === 0) {
        throw new Error('No data found in CSV file')
      }

      const result = await importRecipes(rows)
      setImportResult(result)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipes')
    } finally {
      setIsUploading(false)
    }
  }

  const parseCSV = (text: string): RecipeRow[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row')

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['title', 'ingredients', 'instructions']
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required column: ${required}`)
      }
    }

    const rows: RecipeRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length !== headers.length) continue

      const row: RecipeRow = {
        title: values[headers.indexOf('title')] || '',
        description: values[headers.indexOf('description')] || '',
        ingredients: values[headers.indexOf('ingredients')] || '',
        instructions: values[headers.indexOf('instructions')] || '',
        prep_time: values[headers.indexOf('prep_time')] || '',
        cook_time: values[headers.indexOf('cook_time')] || '',
        servings: values[headers.indexOf('servings')] || '',
        difficulty: values[headers.indexOf('difficulty')] || 'Easy',
        cuisine: values[headers.indexOf('cuisine')] || '',
        meal_type: values[headers.indexOf('meal_type')] || '',
        image_url: values[headers.indexOf('image_url')] || '',
        source_name: values[headers.indexOf('source_name')] || '',
        source_url: values[headers.indexOf('source_url')] || '',
        diet: values[headers.indexOf('diet')] || ''
      }

      if (row.title && row.ingredients && row.instructions) {
        rows.push(row)
      }
    }

    return rows
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const importRecipes = async (rows: RecipeRow[]): Promise<ImportResult> => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Authentication required')

    const result: ImportResult = {
      success: 0,
      errors: 0,
      total: rows.length,
      errorDetails: []
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        // Parse ingredients (expecting format: "1 cup flour, 2 eggs, 1/2 cup sugar")
        const ingredients = row.ingredients
          .split(',')
          .map(ing => ing.trim())
          .filter(ing => ing)
          .map(ing => {
            const parts = ing.split(' ')
            if (parts.length >= 2) {
              return {
                amount: parts[0],
                unit: parts[1],
                name: parts.slice(2).join(' ')
              }
            }
            return {
              amount: '',
              unit: '',
              name: ing
            }
          })

        // Parse instructions (expecting format: "Step 1: Do this. Step 2: Do that.")
        const instructions = row.instructions
          .split(/Step \d+:|\.(?=\s*[A-Z])/)
          .map(inst => inst.trim())
          .filter(inst => inst)

        // Get or create cuisine
        let cuisineId = null
        if (row.cuisine) {
          const { data: cuisine } = await supabase
            .from('cuisines')
            .select('cuisine_id')
            .eq('name', row.cuisine)
            .single()

          if (!cuisine) {
            const { data: newCuisine } = await supabase
              .from('cuisines')
              .insert({ name: row.cuisine })
              .select('cuisine_id')
              .single()
            cuisineId = newCuisine?.cuisine_id
          } else {
            cuisineId = cuisine.cuisine_id
          }
        }

        // Get or create meal type
        let mealTypeId = null
        if (row.meal_type) {
          const { data: mealType } = await supabase
            .from('meal_types')
            .select('meal_type_id')
            .eq('name', row.meal_type)
            .single()

          if (!mealType) {
            const { data: newMealType } = await supabase
              .from('meal_types')
              .insert({ name: row.meal_type })
              .select('meal_type_id')
              .single()
            mealTypeId = newMealType?.meal_type_id
          } else {
            mealTypeId = mealType.meal_type_id
          }
        }

        // Create global recipe
        const { data: recipe, error: recipeError } = await supabase
          .from('global_recipes')
          .insert({
            title: row.title,
            description: row.description || null,
            prep_time: row.prep_time || null,
            cook_time: row.cook_time || null,
            servings: row.servings || null,
            difficulty: row.difficulty || 'Easy',
            cuisine_id: cuisineId,
            meal_type_id: mealTypeId,
            image_url: row.image_url || null,
            source_name: row.source_name || 'CSV Import',
            source_url: row.source_url || null,
            diet: row.diet || null,
            created_by: user.id,
            is_published: true
          })
          .select()
          .single()

        if (recipeError) {
          throw new Error(`Recipe creation failed: ${recipeError.message}`)
        }

        // Create ingredients
        if (ingredients.length > 0) {
          const ingredientInserts = ingredients.map(ing => ({
            recipe_id: recipe.recipe_id,
            amount: ing.amount || null,
            unit: ing.unit || null,
            raw_name: ing.name
          }))

          const { error: ingredientsError } = await supabase
            .from('global_recipe_ingredients')
            .insert(ingredientInserts)

          if (ingredientsError) {
            console.warn(`Ingredients failed for recipe ${row.title}:`, ingredientsError)
          }
        }

        // Create instructions
        if (instructions.length > 0) {
          const instructionInserts = instructions.map((inst, index) => ({
            recipe_id: recipe.recipe_id,
            step_number: index + 1,
            text: inst
          }))

          const { error: instructionsError } = await supabase
            .from('global_recipe_steps')
            .insert(instructionInserts)

          if (instructionsError) {
            console.warn(`Instructions failed for recipe ${row.title}:`, instructionsError)
          }
        }

        result.success++

      } catch (err) {
        result.errors++
        result.errorDetails.push(`Row ${i + 1} (${row.title}): ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return result
  }

  const downloadTemplate = () => {
    const template = `title,description,ingredients,instructions,prep_time,cook_time,servings,difficulty,cuisine,meal_type,image_url,source_name,source_url,diet
"Chocolate Chip Cookies","Delicious homemade cookies","1 cup flour, 2 eggs, 1/2 cup sugar, 1/2 cup butter, 1 cup chocolate chips","Step 1: Mix dry ingredients. Step 2: Cream butter and sugar. Step 3: Combine wet and dry ingredients. Step 4: Bake at 375°F for 10 minutes","15 minutes","10 minutes","24","Easy","American","Dessert","https://example.com/cookies.jpg","CSV Import","https://example.com/recipe","Vegetarian"
"Spaghetti Carbonara","Classic Italian pasta","1 lb spaghetti, 4 eggs, 1 cup parmesan, 8 oz pancetta","Step 1: Cook pasta. Step 2: Fry pancetta. Step 3: Mix eggs and cheese. Step 4: Combine everything","10 minutes","20 minutes","4","Medium","Italian","Dinner","","CSV Import","",""`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recipe-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <RouteGuard requireAuth={true} className="min-h-screen">
      <div className="container mx-auto px-4 py-8" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-orange-900 flex items-center">
                <Database className="w-8 h-8 mr-3" />
                CSV Recipe Import
              </h1>
              <p className="text-orange-700 mt-2">
                Import thousands of recipes from a CSV file into the global cookbook
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-orange-600" />
                    Upload CSV File
                  </CardTitle>
                  <CardDescription>
                    Select a CSV file containing recipe data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Choose CSV File
                      </>
                    )}
                  </Button>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Download */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-orange-600" />
                    CSV Template
                  </CardTitle>
                  <CardDescription>
                    Download a template to see the required format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Instructions & Results */}
            <div className="space-y-6">
              {/* Instructions */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>CSV Format Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Required Columns:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <code className="bg-gray-100 px-1 rounded">title</code> - Recipe name</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">ingredients</code> - Comma-separated list</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">instructions</code> - Step-by-step instructions</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Optional Columns:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <code className="bg-gray-100 px-1 rounded">description</code> - Recipe description</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">prep_time</code> - Preparation time</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">cook_time</code> - Cooking time</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">servings</code> - Number of servings</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">difficulty</code> - Easy/Medium/Hard</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">cuisine</code> - Cuisine type</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">meal_type</code> - Breakfast/Lunch/Dinner/etc</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">image_url</code> - Recipe image URL</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">source_name</code> - Source name</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">source_url</code> - Source URL</li>
                      <li>• <code className="bg-gray-100 px-1 rounded">diet</code> - Dietary restrictions</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> Use quotes around text that contains commas. 
                      Ingredients should be in format: "1 cup flour, 2 eggs, 1/2 cup sugar"
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Import Results */}
              {importResult && (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Import Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult.success}
                        </div>
                        <div className="text-sm text-gray-600">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.errors}
                        </div>
                        <div className="text-sm text-gray-600">Errors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {importResult.total}
                        </div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                    </div>

                    {importResult.errorDetails.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2">Error Details:</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.errorDetails.map((error, index) => (
                            <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importResult.success > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          <strong>Success!</strong> {importResult.success} recipes have been added to the global cookbook.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
