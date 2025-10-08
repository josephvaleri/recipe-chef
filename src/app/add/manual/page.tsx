'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Save, ArrowLeft, Clock, Users, ChefHat } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface Ingredient {
  id: string
  amount: string
  unit: string
  name: string
}

interface Instruction {
  id: string
  step: number
  text: string
}

export default function ManualAddPage() {
  const [recipe, setRecipe] = useState({
    title: '',
    description: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    cuisine: '',
    difficulty: 'Easy',
    imageUrl: ''
  })
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', amount: '', unit: '', name: '' }
  ])
  
  const [instructions, setInstructions] = useState<Instruction[]>([
    { id: '1', step: 1, text: '' }
  ])
  
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const addIngredient = () => {
    const newId = (ingredients.length + 1).toString()
    setIngredients([...ingredients, { id: newId, amount: '', unit: '', name: '' }])
  }

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id))
    }
  }

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ))
  }

  const addInstruction = () => {
    const newId = (instructions.length + 1).toString()
    setInstructions([...instructions, { id: newId, step: instructions.length + 1, text: '' }])
  }

  const removeInstruction = (id: string) => {
    if (instructions.length > 1) {
      const filtered = instructions.filter(inst => inst.id !== id)
      // Renumber steps
      const renumbered = filtered.map((inst, index) => ({ ...inst, step: index + 1 }))
      setInstructions(renumbered)
    }
  }

  const updateInstruction = (id: string, text: string) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, text } : inst
    ))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Validate required fields
      if (!recipe.title.trim()) {
        alert('Recipe title is required')
        return
      }

      if (ingredients.some(ing => !ing.amount.trim() || !ing.name.trim())) {
        alert('All ingredients must have amount and name')
        return
      }

      if (instructions.some(inst => !inst.text.trim())) {
        alert('All instructions must have text')
        return
      }

      // Create the recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('user_recipes')
        .insert({
          user_id: user.id,
          title: recipe.title,
          description: recipe.description || null,
          prep_time: recipe.prepTime || null,
          cook_time: recipe.cookTime || null,
          servings: recipe.servings || null,
          cuisine: recipe.cuisine || null,
          difficulty: recipe.difficulty,
          image_url: recipe.imageUrl || null,
          source_url: null,
          source_name: 'Manual Entry',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (recipeError) {
        console.error('Error creating recipe:', recipeError)
        alert('Error creating recipe. Please try again.')
        return
      }

      // Add ingredients
      const ingredientInserts = ingredients.map(ing => ({
        user_recipe_id: recipeData.user_recipe_id,
        raw_name: ing.name,
        amount: ing.amount,
        unit: ing.unit || null
      }))

      const { error: ingredientsError } = await supabase
        .from('user_recipe_ingredients')
        .insert(ingredientInserts)

      if (ingredientsError) {
        console.error('Error adding ingredients:', ingredientsError)
        alert('Recipe created but failed to add ingredients')
        return
      } else {
        // Auto-analyze ingredients for detailed matching
        try {
          const analyzeResponse = await fetch('/api/ingredients/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_recipe_id: recipeData.user_recipe_id }),
          })

          if (analyzeResponse.ok) {
            const analyzeResult = await analyzeResponse.json()
            console.log('Auto-analyzed ingredients:', analyzeResult)
          }
        } catch (analyzeError) {
          console.error('Error auto-analyzing ingredients:', analyzeError)
          // Don't fail the recipe save if analysis fails
        }
      }

      // Add instructions
      const instructionInserts = instructions.map(inst => ({
        user_recipe_id: recipeData.user_recipe_id,
        step_number: inst.step,
        text: inst.text
      }))

      const { error: instructionsError } = await supabase
        .from('user_recipe_steps')
        .insert(instructionInserts)

      if (instructionsError) {
        console.error('Error adding instructions:', instructionsError)
        alert('Recipe created but failed to add instructions')
        return
      }

      // Add tags
      if (tags.length > 0) {
        const tagInserts = tags.map(tag => ({
          recipe_id: recipeData.recipe_id,
          tag_name: tag
        }))

        const { error: tagsError } = await supabase
          .from('user_recipe_tags')
          .insert(tagInserts)

        if (tagsError) {
          console.error('Error adding tags:', tagsError)
          // Don't fail the whole operation for tags
        }
      }

      // Success! Redirect to the recipe
      router.push(`/recipe/${recipeData.recipe_id}`)

    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Error creating recipe. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
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
                <ChefHat className="w-8 h-8 mr-3" />
                Add Recipe Manually
              </h1>
              <p className="text-orange-700 mt-2">
                Create your own recipe from scratch
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Recipe Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Tell us about your recipe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Recipe Title *
                    </label>
                    <Input
                      placeholder="e.g., Grandma's Chocolate Chip Cookies"
                      value={recipe.title}
                      onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
                      className="border-orange-300 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">
                      Description
                    </label>
                    <Textarea
                      placeholder="Describe your recipe..."
                      value={recipe.description}
                      onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                      className="border-orange-300 focus:border-orange-500 min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Prep Time
                      </label>
                      <Input
                        placeholder="e.g., 15 minutes"
                        value={recipe.prepTime}
                        onChange={(e) => setRecipe({ ...recipe, prepTime: e.target.value })}
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Cook Time
                      </label>
                      <Input
                        placeholder="e.g., 30 minutes"
                        value={recipe.cookTime}
                        onChange={(e) => setRecipe({ ...recipe, cookTime: e.target.value })}
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Servings
                      </label>
                      <Input
                        placeholder="e.g., 4"
                        value={recipe.servings}
                        onChange={(e) => setRecipe({ ...recipe, servings: e.target.value })}
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Cuisine
                      </label>
                      <Input
                        placeholder="e.g., Italian, Mexican, Asian"
                        value={recipe.cuisine}
                        onChange={(e) => setRecipe({ ...recipe, cuisine: e.target.value })}
                        className="border-orange-300 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-900 mb-2">
                        Difficulty
                      </label>
                      <select
                        value={recipe.difficulty}
                        onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value })}
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
                      Image URL (optional)
                    </label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={recipe.imageUrl}
                      onChange={(e) => setRecipe({ ...recipe, imageUrl: e.target.value })}
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
                    List all the ingredients needed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ingredients.map((ingredient, index) => (
                    <motion.div
                      key={ingredient.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          placeholder="Amount"
                          value={ingredient.amount}
                          onChange={(e) => updateIngredient(ingredient.id, 'amount', e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                        <Input
                          placeholder="Unit"
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                        <Input
                          placeholder="Ingredient name"
                          value={ingredient.name}
                          onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeIngredient(ingredient.id)}
                        disabled={ingredients.length === 1}
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
                    Step-by-step cooking instructions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {instructions.map((instruction, index) => (
                    <motion.div
                      key={instruction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {instruction.step}
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Describe this step..."
                          value={instruction.text}
                          onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                          className="border-orange-300 focus:border-orange-500 min-h-[80px]"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeInstruction(instruction.id)}
                        disabled={instructions.length === 1}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addInstruction}
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Instruction
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
                    Add tags to categorize your recipe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      className="border-orange-300 focus:border-orange-500"
                    />
                    <Button
                      onClick={addTag}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardContent className="p-6">
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 py-3"
                    size="lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {isLoading ? 'Saving Recipe...' : 'Save Recipe'}
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
