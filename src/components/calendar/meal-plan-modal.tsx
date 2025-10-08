'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface Recipe {
  user_recipe_id: number;
  title: string;
  servings: number;
  image_url?: string;
}

interface MealPlanEntry {
  recipe_id: number;
  servings_override?: number;
}

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSuccess: () => void;
}

export function MealPlanModal({ isOpen, onClose, selectedDate, onSuccess }: MealPlanModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<MealPlanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRecipes();
    }
  }, [isOpen]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_recipes')
        .select('user_recipe_id, title, servings, image_url')
        .order('title');

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = (recipe: Recipe) => {
    const existing = selectedRecipes.find(r => r.recipe_id === recipe.user_recipe_id);
    if (!existing) {
      setSelectedRecipes([...selectedRecipes, {
        recipe_id: recipe.user_recipe_id,
        servings_override: recipe.servings
      }]);
    }
  };

  const removeRecipe = (recipeId: number) => {
    setSelectedRecipes(selectedRecipes.filter(r => r.recipe_id !== recipeId));
  };

  const updateServings = (recipeId: number, servings: number) => {
    setSelectedRecipes(selectedRecipes.map(r => 
      r.recipe_id === recipeId 
        ? { ...r, servings_override: servings }
        : r
    ));
  };

  const saveMealPlan = async () => {
    if (selectedRecipes.length === 0) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const entries = selectedRecipes.map(recipe => ({
        user_id: user.id,
        plan_date: selectedDate,
        recipe_id: recipe.recipe_id,
        servings_override: recipe.servings_override
      }));

      const { error } = await supabase
        .from('meal_plan_entries')
        .upsert(entries, { 
          onConflict: 'user_id,plan_date,recipe_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving meal plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Add Recipes to {new Date(selectedDate).toLocaleDateString()}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Recipes</Label>
            <Input
              id="search"
              placeholder="Search by recipe name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {/* Available Recipes */}
            <div>
              <h3 className="font-semibold mb-3">Available Recipes</h3>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-4">Loading recipes...</div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No recipes found</div>
                ) : (
                  filteredRecipes.map(recipe => (
                    <div key={recipe.user_recipe_id} className="flex items-center space-x-3 p-2 border rounded">
                      {recipe.image_url && (
                        <img 
                          src={recipe.image_url} 
                          alt={recipe.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{recipe.title}</p>
                        <p className="text-sm text-gray-500">{recipe.servings} servings</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addRecipe(recipe)}
                        disabled={selectedRecipes.some(r => r.recipe_id === recipe.user_recipe_id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Recipes */}
            <div>
              <h3 className="font-semibold mb-3">Selected for {selectedDate}</h3>
              <div className="space-y-2">
                {selectedRecipes.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No recipes selected</div>
                ) : (
                  selectedRecipes.map(entry => {
                    const recipe = recipes.find(r => r.user_recipe_id === entry.recipe_id);
                    if (!recipe) return null;

                    return (
                      <div key={entry.recipe_id} className="flex items-center space-x-3 p-2 border rounded bg-gray-50">
                        {recipe.image_url && (
                          <img 
                            src={recipe.image_url} 
                            alt={recipe.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{recipe.title}</p>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`servings-${entry.recipe_id}`} className="text-sm">Servings:</Label>
                            <Input
                              id={`servings-${entry.recipe_id}`}
                              type="number"
                              min="1"
                              value={entry.servings_override || recipe.servings}
                              onChange={(e) => updateServings(entry.recipe_id, Number(e.target.value))}
                              className="w-16 h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRecipe(entry.recipe_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveMealPlan} disabled={selectedRecipes.length === 0 || saving}>
              {saving ? 'Saving...' : `Save ${selectedRecipes.length} Recipe${selectedRecipes.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
