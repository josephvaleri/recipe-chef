'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingListGenerator, ShoppingListDisplay } from '@/components/shopping-list/shopping-list-generator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logEventAndAward } from '@/lib/badges';
import { useBadgeToast } from '@/components/badges/BadgeToast';

interface ShoppingListItem {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
}

interface ShoppingListData {
  [category: string]: ShoppingListItem[];
}

function SearchParamsHandler({ onAutoGenerate }: { onAutoGenerate: (params: { start: string; days: number; people: number }) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const start = searchParams.get('start');
    const days = searchParams.get('days');
    const people = searchParams.get('people');

    if (start && days && people) {
      const params = {
        start,
        days: parseInt(days),
        people: parseInt(people)
      };
      onAutoGenerate(params);
    }
  }, [searchParams, onAutoGenerate]);

  return null;
}

function ShoppingListPageContent() {
  const [shoppingList, setShoppingList] = useState<ShoppingListData>({});
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generationParams, setGenerationParams] = useState<{
    start: string;
    days: number;
    people: number;
  } | null>(null);
  const router = useRouter();
  const { showBadgeAwards } = useBadgeToast();

  const handleGenerate = useCallback(async (params: { start: string; days: number; people: number }) => {
    setLoading(true);
    setGenerationParams(params);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Please sign in to generate shopping lists');
        return;
      }

      // Direct query approach - get meal plans for both user and global recipes
      const { data: mealPlans, error: mealPlanError } = await supabase
        .from('meal_plan')
        .select(`
          id,
          date,
          user_recipe_id,
          global_recipe_id,
          user_recipes(
            user_recipe_id,
            title,
            servings
          ),
          global_recipes(
            recipe_id,
            title,
            servings
          )
        `)
        .eq('user_id', user.id)
        .gte('date', params.start)
        .lt('date', new Date(new Date(params.start).getTime() + params.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (mealPlanError) {
        console.error('Meal plan query error:', mealPlanError);
        toast.error('Failed to load meal plans: ' + mealPlanError.message);
        return;
      }

      console.log('Found meal plans:', mealPlans);

      // Get detailed ingredients for each recipe (USER RECIPES ONLY)
      const allIngredients: any[] = [];
      for (const mealPlan of mealPlans || []) {
        // Skip global recipes - they shouldn't be in meal plan directly
        if (mealPlan.global_recipe_id && !mealPlan.user_recipe_id) {
          console.warn('Warning: Global recipe in meal plan without user copy:', mealPlan.global_recipe_id);
          continue;
        }
        
        console.log('Processing meal plan:', mealPlan.user_recipe_id);
        
        // First check if this recipe has detail records
        const { data: detailCheck, error: detailCheckError } = await supabase
          .from('user_recipe_ingredients_detail')
          .select('detail_id, user_recipe_ingredient_id')
          .eq('user_recipe_id', mealPlan.user_recipe_id);
        
        console.log(`Recipe ${mealPlan.user_recipe_id} detail records:`, detailCheck?.length || 0);
        if (detailCheck && detailCheck.length > 0) {
          const nullFKCount = detailCheck.filter(d => !d.user_recipe_ingredient_id).length;
          console.log(`  - Records with NULL FK: ${nullFKCount}`);
        }
        
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('user_recipe_ingredients_detail')
          .select(`
            original_text,
            matched_term,
            match_type,
            matched_alias,
            user_recipe_ingredients!inner(
              id,
              amount,
              unit,
              raw_name
            ),
            ingredients!inner(
              ingredient_id,
              name,
              category_id,
              ingredient_categories(name)
            )
          `)
          .eq('user_recipe_id', mealPlan.user_recipe_id);

        if (ingredientsError) {
          console.error('Ingredients query error for recipe', mealPlan.user_recipe_id, ':', ingredientsError);
          continue;
        }
        
        console.log(`Recipe ${mealPlan.user_recipe_id} returned ${ingredients?.length || 0} ingredients after joins`);

        // Add recipe info to each ingredient
        if (ingredients && ingredients.length > 0) {
          ingredients.forEach(ingredient => {
            allIngredients.push({
              ...ingredient,
              recipe_id: mealPlan.user_recipe_id,
              recipe_title: (mealPlan as any).user_recipes?.[0]?.title || 'Unknown',
              servings: (mealPlan as any).user_recipes?.[0]?.servings || '4',
              date: mealPlan.date
            });
          });
        } else {
          // FALLBACK: If no detail records with FK, use raw ingredients without detail matching
          console.log(`Recipe ${mealPlan.user_recipe_id} has no linked detail records, using raw ingredients`);
          const { data: rawIngredients, error: rawError } = await supabase
            .from('user_recipe_ingredients')
            .select('id, raw_name, amount, unit')
            .eq('user_recipe_id', mealPlan.user_recipe_id);
          
          if (!rawError && rawIngredients) {
            console.log(`  Found ${rawIngredients.length} raw ingredients`);
            rawIngredients.forEach(ing => {
              allIngredients.push({
                // Create a structure compatible with the processing logic
                user_recipe_ingredients: {
                  id: ing.id,
                  amount: ing.amount,
                  unit: ing.unit,
                  raw_name: ing.raw_name
                },
                ingredients: null, // No matched ingredient
                matched_term: ing.raw_name,
                original_text: ing.raw_name,
                recipe_id: mealPlan.user_recipe_id,
                recipe_title: (mealPlan as any).user_recipes?.[0]?.title || 'Unknown',
                servings: (mealPlan as any).user_recipes?.[0]?.servings || '4',
                date: mealPlan.date
              });
            });
          }
        }
      }

      console.log('Found ingredients:', allIngredients);

      // Process the ingredients with amounts
      const ingredientMap = new Map();
      
      allIngredients.forEach((ingredient: any) => {
        const servings = parseFloat(ingredient.servings) || 4;
        const scaleFactor = params.people / servings;
        
        // Get ingredient details
        const ingredientName = ingredient.ingredients?.name || ingredient.matched_term || ingredient.original_text || 'Unknown Ingredient';
        const categoryName = ingredient.ingredients?.ingredient_categories?.name || 'Other';
        const ingredientId = ingredient.ingredients?.ingredient_id;
        
        // Get amount and unit from the original ingredient row
        const originalAmount = parseFloat(ingredient.user_recipe_ingredients?.amount) || 0;
        const unit = ingredient.user_recipe_ingredients?.unit || 'count';
        
        // Scale the amount
        const scaledAmount = originalAmount * scaleFactor;
        
        // For ingredients without matched ingredient_id, use raw name as key
        const key = ingredientId 
          ? `${ingredientId}-${unit}`
          : `raw-${ingredientName}-${unit}`;
        
        if (ingredientMap.has(key)) {
          ingredientMap.get(key).quantity += scaledAmount;
        } else {
          ingredientMap.set(key, {
            ingredient_id: ingredientId || null,
            ingredient_name: ingredientName,
            quantity: scaledAmount || 0,
            unit: unit,
            category_name: categoryName
          });
        }
      });

      // Group by category
      const grouped = Array.from(ingredientMap.values()).reduce((acc: any, item: any) => {
        const category = item.category_name;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          quantity: Math.round(item.quantity * 100) / 100, // Round to 2 decimal places
          unit: item.unit
        });
        return acc;
      }, {});

      setShoppingList(grouped);
      setGenerated(true);
      
      const totalItems = Object.values(grouped).flat().length;
      
      // Log badge event for shopping list generation
      try {
        const result = await logEventAndAward(
          'shopping_list_generated',
          {
            from_date: params.start,
            to_date: endDate,
            recipe_count: mealPlanData.length,
            item_count: totalItems
          }
        );
        
        if (result?.awards && result.awards.length > 0) {
          showBadgeAwards(result.awards);
        }
      } catch (badgeError) {
        console.error('Error logging badge event:', badgeError);
        // Don't fail shopping list generation if badge logging fails
      }
      
      if (totalItems === 0) {
        toast.info('No recipes found for the selected date range. Add some recipes to your calendar first!');
      } else {
        toast.success(`Generated shopping list with ${totalItems} items`);
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      toast.error('Failed to generate shopping list');
    } finally {
      setLoading(false);
    }
  }, []);

  // This will be called from the SearchParamsHandler component
  const handleAutoGenerate = useCallback((params: { start: string; days: number; people: number }) => {
    setGenerationParams(params);
    handleGenerate(params);
  }, [handleGenerate]);

  const handlePrint = () => {
    if (!generationParams) return;
    
    const params = new URLSearchParams({
      start: generationParams.start,
      days: generationParams.days.toString(),
      people: generationParams.people.toString()
    });
    
    window.open(`/shopping-list/print?${params.toString()}`, '_blank');
  };

  const handlePushToAlexa = async () => {
    if (!generated) return;
    
    setLoading(true);
    try {
      const items = Object.values(shoppingList).flat();
      
      // For now, just copy to clipboard as fallback
      const listText = items.map(item => {
        const quantity = item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '';
        return `${item.ingredient_name}${quantity ? ` — ${quantity}` : ''}`;
      }).join('\n');
      
      await navigator.clipboard.writeText(listText);
      toast.success('Shopping list copied to clipboard (Alexa integration coming soon)');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    
    try {
      const items = Object.values(shoppingList).flat();
      const listText = items.map(item => {
        const quantity = item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '';
        return `${item.ingredient_name}${quantity ? ` — ${quantity}` : ''}`;
      }).join('\n');
      
      await navigator.clipboard.writeText(listText);
      toast.success('Shopping list copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SearchParamsHandler onAutoGenerate={handleAutoGenerate} />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping List Generator</h1>
          <p className="text-gray-600">
            Add recipes to your calendar, then generate a scaled shopping list for your meal planning
          </p>
        </div>

        {!generated ? (
          <ShoppingListGenerator 
            onGenerate={handleGenerate} 
            loading={loading}
          />
        ) : (
          <ShoppingListDisplay
            shoppingList={shoppingList}
            startDate={generationParams!.start}
            days={generationParams!.days}
            people={generationParams!.people}
            onPrint={handlePrint}
            onPushToAlexa={handlePushToAlexa}
            onCopy={handleCopy}
            loading={loading}
          />
        )}

        {generated && (
          <div className="text-center">
            <button
              onClick={() => {
                setGenerated(false);
                setShoppingList({});
                setGenerationParams(null);
              }}
              className="text-orange-600 hover:text-orange-700 underline"
            >
              Generate a new shopping list
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShoppingListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ShoppingListPageContent />
    </Suspense>
  );
}
// Force rebuild Thu Oct  9 17:52:15 CEST 2025
