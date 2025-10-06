'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ChefHat, 
  Clock, 
  Users, 
  Plus
} from 'lucide-react'

interface Ingredient {
  ingredient_id?: number
  ingredient?: { 
    name: string
    category_id: number
  }
  raw_name?: string
  amount?: string
  unit?: string
}

interface RecipeCardProps {
  recipe: {
    recipe_id?: number
    user_recipe_id?: number
    title: string
    description?: string
    image_url?: string
    prep_time?: string
    cook_time?: string
    total_time?: string
    servings?: string
    difficulty?: string
    cuisine?: { name: string }
    meal_type?: { name: string }
    ingredients?: Ingredient[]
    rating?: number
    score?: number
    added_count?: number
  }
  onAddToCookbook?: (recipeId: number) => void
  showAddButton?: boolean
}

export default function RecipeCard({ 
  recipe, 
  onAddToCookbook, 
  showAddButton = true
}: RecipeCardProps) {
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    return timeStr.replace('PT', '').replace('H', 'h ').replace('M', 'm').trim()
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      {recipe.image_url ? (
        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
          <img 
            src={recipe.image_url} 
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 rounded-t-lg flex items-center justify-center">
          <ChefHat className="w-12 h-12 text-orange-400" />
        </div>
      )}
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {recipe.title}
        </h3>
        
        {recipe.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-3">
            {recipe.total_time && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(recipe.total_time)}
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {recipe.servings}
              </div>
            )}
          </div>
          
          {recipe.score && (
            <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
              {Math.round(recipe.score * 100)}% match
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {recipe.cuisine && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                {recipe.cuisine.name}
              </span>
            )}
            {recipe.meal_type && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {recipe.meal_type.name}
              </span>
            )}
          </div>
          
          {recipe.added_count && (
            <div className="flex items-center text-xs text-gray-500">
              <Plus className="w-3 h-3 mr-1" />
              {recipe.added_count} added
            </div>
          )}
        </div>

        {showAddButton && onAddToCookbook && (
          <Button 
            onClick={() => onAddToCookbook(recipe.recipe_id || recipe.user_recipe_id!)}
            className="w-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Cookbook
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
