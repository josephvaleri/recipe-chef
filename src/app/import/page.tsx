'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RouteGuard } from '@/components/route-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Globe, AlertCircle, CheckCircle, ExternalLink, ChefHat, Upload, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import JSZip from 'jszip'
import * as pako from 'pako'

interface ImportResult {
  recipe: any
  paprikaText: string
  confidence: 'high' | 'medium' | 'low'
  source: string
  title: string
}

export default function ImportPage() {
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedRecipe, setEditedRecipe] = useState<any>(null)
  const [importMethod, setImportMethod] = useState<'url' | 'paprika'>('url')
  const [paprikaFile, setPaprikaFile] = useState<File | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for URL from Web Share Target
    const sharedUrl = searchParams.get('url')
    const sharedTitle = searchParams.get('title')
    const sharedText = searchParams.get('text')
    
    if (sharedUrl) {
      setUrl(sharedUrl)
      handleImport(sharedUrl)
    } else if (sharedText && sharedText.includes('http')) {
      // Extract URL from shared text
      const urlMatch = sharedText.match(/https?:\/\/[^\s]+/)
      if (urlMatch) {
        setUrl(urlMatch[0])
        handleImport(urlMatch[0])
      }
    }
  }, [searchParams])

  const handleImport = async (importUrl: string) => {
    setIsImporting(true)
    setError('')
    setImportResult(null)

    try {
      const response = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: importUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import recipe')
      }

      setImportResult(data)
      setEditedRecipe(data.recipe)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSubmitImport = () => {
    if (importMethod === 'url' && url.trim()) {
      handleImport(url.trim())
    } else if (importMethod === 'paprika' && paprikaFile) {
      handlePaprikaImport(paprikaFile)
    }
  }

  // Helper function to decompress gzipped content
  const decompressGzippedContent = async (file: any): Promise<string> => {
    try {
      // First try to read as text
      const text = await file.async('text')
      return text
    } catch (error) {
      // If text reading fails, try to decompress as gzip
      try {
        const arrayBuffer = await file.async('arraybuffer')
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Check if it's gzipped (magic bytes: 1f 8b)
        if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
          const decompressed = pako.inflate(uint8Array, { to: 'string' })
          return decompressed
        } else {
          throw new Error('File is not gzipped')
        }
      } catch (decompressError) {
        throw new Error(`Failed to read file: ${decompressError instanceof Error ? decompressError.message : 'Unknown error'}`)
      }
    }
  }

  const handlePaprikaImport = async (file: File) => {
    setIsImporting(true)
    setError('')
    setImportResult(null)

    try {
      // Check if file is a single .paprikarecipe file
      const isSinglePaprikaFile = file.name.endsWith('.paprikarecipe')
      
      if (isSinglePaprikaFile) {
        // Handle single .paprikarecipe file
        console.log('Processing single .paprikarecipe file:', file.name)
        
        // Check if the single file is gzipped
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 2))
        const isGzipped = uint8Array[0] === 0x1f && uint8Array[1] === 0x8b
        
        let text: string
        if (isGzipped) {
          console.log('Single file is gzipped, decompressing...')
          const fullArrayBuffer = await file.arrayBuffer()
          const fullUint8Array = new Uint8Array(fullArrayBuffer)
          text = pako.inflate(fullUint8Array, { to: 'string' })
        } else {
          text = await file.text()
        }
        
        const paprikaData = JSON.parse(text)
        
        // Convert the recipe
        const convertedRecipe = convertPaprikaToRecipe(paprikaData)
        
        setImportResult({
          recipe: convertedRecipe,
          paprikaText: generatePaprikaText(convertedRecipe),
          confidence: 'high',
          source: 'Paprika App (Single Recipe)',
          title: file.name
        })
        
        setEditedRecipe(convertedRecipe)
        return // Exit early since we've processed the single recipe
      }

      // Check if the file is a ZIP file by reading the first few bytes
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4))
      const isZipFile = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B // "PK" signature
      
      let text: string
      let paprikaData: any
      
      if (isZipFile) {
        // Handle ZIP file - extract and find the JSON content
        const zip = new JSZip()
        const zipContent = await zip.loadAsync(arrayBuffer)
        
        // Debug: Log all files in the ZIP
        const allFiles = Object.keys(zipContent.files)
        console.log('Files in ZIP:', allFiles)
        
        // Look for JSON files in the ZIP (more flexible matching)
        const jsonFiles = Object.keys(zipContent.files).filter(name => {
          const lowerName = name.toLowerCase()
          return lowerName.endsWith('.json') || 
                 lowerName.endsWith('.paprikarecipes') ||
                 lowerName.includes('recipe') ||
                 lowerName.includes('paprika')
        })
        
        console.log('Potential JSON files found:', jsonFiles)
        
        if (jsonFiles.length === 0) {
          // If no obvious JSON files, try to find any file that might contain JSON
          const allFileNames = Object.keys(zipContent.files)
          const possibleJsonFile = allFileNames.find(name => {
            const file = zipContent.files[name]
            return !file.dir && name.length > 0
          })
          
          if (possibleJsonFile) {
            console.log('Trying file as JSON:', possibleJsonFile)
            const jsonFile = zipContent.files[possibleJsonFile]
            text = await jsonFile.async('text')
          } else {
            throw new Error(`No suitable files found in the ZIP archive. Found files: ${allFiles.join(', ')}`)
          }
        } else {
          // Use the first JSON file found
          const jsonFile = zipContent.files[jsonFiles[0]]
          text = await jsonFile.async('text')
        }
      } else {
        // Handle regular text file
        text = await file.text()
      }
      
      paprikaData = JSON.parse(text)

      // Handle both single recipe and multiple recipes
      const recipes = Array.isArray(paprikaData) ? paprikaData : [paprikaData]
      
      if (recipes.length === 0) {
        throw new Error('No recipes found in Paprika file')
      }

      // For now, we'll process the first recipe
      // In the future, we could add a recipe selector for multiple recipes
      const recipe = recipes[0]
      
      if (!recipe.name) {
        throw new Error('Invalid Paprika recipe format: missing recipe name')
      }

      // Convert Paprika format to our internal format
      const convertedRecipe = convertPaprikaToRecipe(recipe)
      
      setImportResult({
        recipe: convertedRecipe,
        paprikaText: generatePaprikaText(convertedRecipe),
        confidence: 'high',
        source: 'Paprika App',
        title: file.name
      })
      
      setEditedRecipe(convertedRecipe)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Paprika file')
    } finally {
      setIsImporting(false)
    }
  }

  const convertPaprikaToRecipe = (paprikaRecipe: any) => {
    console.log('Paprika recipe structure:', paprikaRecipe)
    
    // Convert Paprika ingredients format - handle different possible structures
    let ingredients = []
    
    if (paprikaRecipe.ingredients) {
      if (Array.isArray(paprikaRecipe.ingredients)) {
        // Standard array format
        ingredients = paprikaRecipe.ingredients.map((ing: any) => ({
          amount: ing.amount || '',
          unit: ing.unit || '',
          name: ing.name || ing.item || ''
        }))
      } else if (typeof paprikaRecipe.ingredients === 'object') {
        // Object format - convert to array
        ingredients = Object.values(paprikaRecipe.ingredients).map((ing: any) => ({
          amount: ing.amount || '',
          unit: ing.unit || '',
          name: ing.name || ing.item || ''
        }))
      } else if (typeof paprikaRecipe.ingredients === 'string') {
        // String format - split by newlines or commas
        const ingredientTexts = paprikaRecipe.ingredients.split(/[\n,;]/).map((text: string) => text.trim()).filter(Boolean)
        ingredients = ingredientTexts.map((text: string) => ({
          amount: '',
          unit: '',
          name: text
        }))
      }
    }

    // Convert Paprika instructions format - handle different possible structures
    let instructions = []
    
    if (paprikaRecipe.directions) {
      if (Array.isArray(paprikaRecipe.directions)) {
        instructions = paprikaRecipe.directions.map((dir: any) => {
          if (typeof dir === 'string') return dir
          return dir.text || dir.direction || ''
        }).filter(Boolean)
      } else if (typeof paprikaRecipe.directions === 'object') {
        // Object format - convert to array
        instructions = Object.values(paprikaRecipe.directions).map((dir: any) => {
          if (typeof dir === 'string') return dir
          return dir.text || dir.direction || ''
        }).filter(Boolean)
      } else if (typeof paprikaRecipe.directions === 'string') {
        // String format - split by newlines
        instructions = paprikaRecipe.directions.split('\n').map((text: string) => text.trim()).filter(Boolean)
      }
    } else if (paprikaRecipe.instructions) {
      // Alternative field name
      if (Array.isArray(paprikaRecipe.instructions)) {
        instructions = paprikaRecipe.instructions.map((dir: any) => {
          if (typeof dir === 'string') return dir
          return dir.text || dir.direction || ''
        }).filter(Boolean)
      } else if (typeof paprikaRecipe.instructions === 'string') {
        instructions = paprikaRecipe.instructions.split('\n').map((text: string) => text.trim()).filter(Boolean)
      }
    }

    return {
      title: paprikaRecipe.name || 'Untitled Recipe',
      description: paprikaRecipe.description || paprikaRecipe.notes || '',
      image: paprikaRecipe.image_url || paprikaRecipe.photo_url || '',
      ingredients: ingredients,
      instructions: instructions,
      prepTime: formatPaprikaTime(paprikaRecipe.prep_time),
      cookTime: formatPaprikaTime(paprikaRecipe.cook_time),
      servings: paprikaRecipe.servings || '',
      difficulty: mapPaprikaDifficulty(paprikaRecipe.difficulty),
      cuisine: paprikaRecipe.cuisine || '',
      sourceName: paprikaRecipe.source || 'Paprika App',
      sourceUrl: paprikaRecipe.source_url || ''
    }
  }

  const formatPaprikaTime = (time: any) => {
    if (!time) return ''
    if (typeof time === 'number') {
      return `${time} minutes`
    }
    return String(time)
  }

  const mapPaprikaDifficulty = (difficulty: any) => {
    if (!difficulty) return 'Easy'
    const diff = String(difficulty).toLowerCase()
    if (diff.includes('easy')) return 'Easy'
    if (diff.includes('medium')) return 'Medium'
    if (diff.includes('hard')) return 'Hard'
    return 'Easy'
  }

  const generatePaprikaText = (recipe: any) => {
    let text = `${recipe.title}\n\n`
    
    if (recipe.description) {
      text += `${recipe.description}\n\n`
    }

    if (recipe.prepTime || recipe.cookTime || recipe.servings) {
      text += `Prep Time: ${recipe.prepTime || 'N/A'}\n`
      text += `Cook Time: ${recipe.cookTime || 'N/A'}\n`
      text += `Servings: ${recipe.servings || 'N/A'}\n\n`
    }

    text += `Ingredients:\n`
    recipe.ingredients.forEach((ing: any, index: number) => {
      text += `${index + 1}. ${ing.amount} ${ing.unit} ${ing.name}\n`
    })

    text += `\nInstructions:\n`
    recipe.instructions.forEach((inst: string, index: number) => {
      text += `${index + 1}. ${inst}\n`
    })

    return text
  }

  const handleSaveRecipe = async () => {
    if (!editedRecipe || !importResult) return

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Create the recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('user_recipes')
        .insert({
          user_id: user.id,
          title: editedRecipe.title,
          description: editedRecipe.description || null,
          prep_time: editedRecipe.prepTime || null,
          cook_time: editedRecipe.cookTime || null,
          servings: editedRecipe.servings || null,
          cuisine: editedRecipe.cuisine || null,
          difficulty: editedRecipe.difficulty || 'Easy',
          image_url: editedRecipe.image || null,
          source_url: importResult.recipe.sourceUrl || url,
          source_name: importResult.recipe.sourceName || new URL(url).hostname,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (recipeError) {
        throw new Error('Failed to save recipe')
      }

      // Save ingredients
      if (editedRecipe.ingredients && editedRecipe.ingredients.length > 0) {
        const ingredients = editedRecipe.ingredients.map((ing: any, index: number) => ({
          user_recipe_id: recipeData.user_recipe_id,
          amount: ing.amount || '',
          unit: ing.unit || null,
          raw_name: ing.name || '',
          order_index: index + 1
        }))

        await supabase
          .from('user_recipe_ingredients')
          .insert(ingredients)
      }

      // Save instructions
      if (editedRecipe.instructions && editedRecipe.instructions.length > 0) {
        const instructions = editedRecipe.instructions.map((inst: any, index: number) => ({
          user_recipe_id: recipeData.user_recipe_id,
          step_number: index + 1,
          text: inst,
          order_index: index + 1
        }))

        await supabase
          .from('user_recipe_steps')
          .insert(instructions)
      }

      // Redirect to the new recipe
      router.push(`/recipe/${recipeData.user_recipe_id}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe')
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <RouteGuard requireAuth={true} className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-900 flex items-center">
                <Download className="w-8 h-8 mr-3" />
                Import Recipe
              </h1>
              <p className="text-orange-700 mt-2">
                Import recipes from websites or upload Paprika recipe files
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Import Form */}
            <div className="lg:col-span-1 space-y-6">
              {/* Import Method Selection */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Choose Import Method</CardTitle>
                  <CardDescription>
                    Select how you want to import your recipe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={importMethod === 'url' ? 'default' : 'outline'}
                      onClick={() => setImportMethod('url')}
                      className={importMethod === 'url' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-300 text-orange-700 hover:bg-orange-50'}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      URL
                    </Button>
                    <Button
                      variant={importMethod === 'paprika' ? 'default' : 'outline'}
                      onClick={() => setImportMethod('paprika')}
                      className={importMethod === 'paprika' ? 'bg-orange-600 hover:bg-orange-700' : 'border-orange-300 text-orange-700 hover:bg-orange-50'}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Paprika
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* URL Import */}
              {importMethod === 'url' && (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Globe className="w-5 h-5 mr-2 text-orange-600" />
                      Import from URL
                    </CardTitle>
                    <CardDescription>
                      Paste a recipe URL to import automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Recipe URL
                      </label>
                      <Input
                        placeholder="https://example.com/recipe"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="border-orange-300 focus:border-orange-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitImport()
                          }
                        }}
                      />
                    </div>

                    <Button
                      onClick={handleSubmitImport}
                      disabled={!url.trim() || isImporting}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {isImporting ? 'Importing...' : 'Import Recipe'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Paprika Import */}
              {importMethod === 'paprika' && (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-orange-600" />
                      Import from Paprika
                    </CardTitle>
                      <CardDescription>
                        Upload .paprikarecipe (single recipe) or .paprikarecipes (multiple recipes) files from Paprika App
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Paprika Recipe File
                      </label>
                      <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                      <input
                        type="file"
                        accept=".paprikarecipe,.paprikarecipes,.json"
                        onChange={(e) => setPaprikaFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="paprika-file-input"
                      />
                        <label htmlFor="paprika-file-input" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                          <p className="text-sm text-orange-700 mb-1">
                            Click to upload Paprika file
                          </p>
                        <p className="text-xs text-orange-500">
                          Supports .paprikarecipe, .paprikarecipes, .json files, and ZIP archives
                        </p>
                        </label>
                      </div>
                      {paprikaFile && (
                        <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                          <p className="text-sm text-orange-700">
                            <FileText className="w-4 h-4 inline mr-1" />
                            {paprikaFile.name}
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleSubmitImport}
                      disabled={!paprikaFile || isImporting}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {isImporting ? 'Importing...' : 'Import Recipe'}
                    </Button>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700">
                          <strong>Tip:</strong> In Paprika App, you can export individual recipes (.paprikarecipe) or all recipes (.paprikarecipes). 
                          Multiple recipes may be in ZIP format - we'll automatically extract them.
                        </p>
                      </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {importResult && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">
                            Recipe imported successfully
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getConfidenceColor(importResult.confidence)}>
                            {importResult.confidence} confidence
                          </Badge>
                          <Badge variant="outline">
                            {importResult.source}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Status Messages */}
              {error && importMethod === 'url' && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {importResult && importMethod === 'url' && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">
                      Recipe imported successfully
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getConfidenceColor(importResult.confidence)}>
                      {importResult.confidence} confidence
                    </Badge>
                    <Badge variant="outline">
                      {importResult.source}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Recipe Preview/Edit */}
            <div className="lg:col-span-2">
              {importResult && (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <ChefHat className="w-5 h-5 mr-2" />
                          {isEditing ? 'Edit Recipe' : 'Imported Recipe'}
                        </CardTitle>
                        <CardDescription>
                          Review and edit before saving to your cookbook
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(!isEditing)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        {isEditing ? 'Preview' : 'Edit'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Recipe Image */}
                    {editedRecipe?.image && (
                      <div className="flex justify-center">
                        <img
                          src={editedRecipe.image}
                          alt={editedRecipe.title}
                          className="w-64 h-48 object-cover rounded-lg shadow-md"
                        />
                      </div>
                    )}

                    {/* Recipe Title */}
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Recipe Title
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedRecipe?.title || ''}
                          onChange={(e) => setEditedRecipe({
                            ...editedRecipe,
                            title: e.target.value
                          })}
                          className="border-orange-300 focus:border-orange-500"
                        />
                      ) : (
                        <h2 className="text-2xl font-bold text-orange-900">
                          {editedRecipe?.title}
                        </h2>
                      )}
                    </div>

                    {/* Recipe Description */}
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Description
                      </label>
                      {isEditing ? (
                        <Textarea
                          value={editedRecipe?.description || ''}
                          onChange={(e) => setEditedRecipe({
                            ...editedRecipe,
                            description: e.target.value
                          })}
                          className="border-orange-300 focus:border-orange-500 min-h-[100px]"
                        />
                      ) : (
                        <p className="text-orange-700">
                          {editedRecipe?.description || 'No description available'}
                        </p>
                      )}
                    </div>

                    {/* Recipe Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-2">
                          Prep Time
                        </label>
                        {isEditing ? (
                          <Input
                            value={editedRecipe?.prepTime || ''}
                            onChange={(e) => setEditedRecipe({
                              ...editedRecipe,
                              prepTime: e.target.value
                            })}
                            className="border-orange-300 focus:border-orange-500"
                          />
                        ) : (
                          <p className="text-orange-700">
                            {editedRecipe?.prepTime || 'N/A'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-2">
                          Cook Time
                        </label>
                        {isEditing ? (
                          <Input
                            value={editedRecipe?.cookTime || ''}
                            onChange={(e) => setEditedRecipe({
                              ...editedRecipe,
                              cookTime: e.target.value
                            })}
                            className="border-orange-300 focus:border-orange-500"
                          />
                        ) : (
                          <p className="text-orange-700">
                            {editedRecipe?.cookTime || 'N/A'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-orange-900 mb-2">
                          Servings
                        </label>
                        {isEditing ? (
                          <Input
                            value={editedRecipe?.servings || ''}
                            onChange={(e) => setEditedRecipe({
                              ...editedRecipe,
                              servings: e.target.value
                            })}
                            className="border-orange-300 focus:border-orange-500"
                          />
                        ) : (
                          <p className="text-orange-700">
                            {editedRecipe?.servings || 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Ingredients
                      </label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {editedRecipe?.ingredients?.map((ing: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={ing.amount || ''}
                                placeholder="Amount"
                                onChange={(e) => {
                                  const newIngredients = [...editedRecipe.ingredients]
                                  newIngredients[index].amount = e.target.value
                                  setEditedRecipe({
                                    ...editedRecipe,
                                    ingredients: newIngredients
                                  })
                                }}
                                className="w-20 border-orange-300 focus:border-orange-500"
                              />
                              <Input
                                value={ing.unit || ''}
                                placeholder="Unit"
                                onChange={(e) => {
                                  const newIngredients = [...editedRecipe.ingredients]
                                  newIngredients[index].unit = e.target.value
                                  setEditedRecipe({
                                    ...editedRecipe,
                                    ingredients: newIngredients
                                  })
                                }}
                                className="w-20 border-orange-300 focus:border-orange-500"
                              />
                              <Input
                                value={ing.name || ''}
                                placeholder="Ingredient name"
                                onChange={(e) => {
                                  const newIngredients = [...editedRecipe.ingredients]
                                  newIngredients[index].name = e.target.value
                                  setEditedRecipe({
                                    ...editedRecipe,
                                    ingredients: newIngredients
                                  })
                                }}
                                className="flex-1 border-orange-300 focus:border-orange-500"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {editedRecipe?.ingredients?.map((ing: any, index: number) => (
                            <li key={index} className="text-orange-700">
                              {ing.amount} {ing.unit} {ing.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Instructions
                      </label>
                      {isEditing ? (
                        <div className="space-y-2">
                          {editedRecipe?.instructions?.map((inst: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                                {index + 1}
                              </span>
                              <Textarea
                                value={inst}
                                onChange={(e) => {
                                  const newInstructions = [...editedRecipe.instructions]
                                  newInstructions[index] = e.target.value
                                  setEditedRecipe({
                                    ...editedRecipe,
                                    instructions: newInstructions
                                  })
                                }}
                                className="flex-1 border-orange-300 focus:border-orange-500 min-h-[60px]"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ol className="space-y-2">
                          {editedRecipe?.instructions?.map((inst: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                                {index + 1}
                              </span>
                              <span className="text-orange-700">{inst}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>

                    {/* Source Link */}
                    <div className="pt-4 border-t border-orange-200">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-orange-600">Source:</span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-orange-600 hover:text-orange-700 underline flex items-center space-x-1"
                        >
                          <span>{new URL(url).hostname}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                      <Button
                        onClick={handleSaveRecipe}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        size="lg"
                      >
                        Save to My Cookbook
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!importResult && !isImporting && (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardContent className="p-12 text-center">
                    <Download className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-orange-900 mb-2">
                      Ready to Import
                    </h3>
                    <p className="text-orange-700">
                      Enter a recipe URL to get started with the import process
                    </p>
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
