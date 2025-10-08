'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChefHat } from 'lucide-react';
import { MealPlanModal } from './meal-plan-modal';

interface CalendarDayProps {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  mealPlanEntries?: Array<{
    recipe_id: number;
    title: string;
    servings_override?: number;
  }>;
  onMealPlanUpdate: () => void;
}

export function CalendarDay({ 
  date, 
  isCurrentMonth, 
  isToday, 
  mealPlanEntries = [],
  onMealPlanUpdate 
}: CalendarDayProps) {
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);

  const handleAddRecipe = () => {
    setShowMealPlanModal(true);
  };

  const handleMealPlanSuccess = () => {
    setShowMealPlanModal(false);
    onMealPlanUpdate();
  };

  return (
    <>
      <div 
        className={`
          relative min-h-[120px] p-2 border border-gray-200 
          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
          ${isToday ? 'ring-2 ring-orange-500' : ''}
          hover:bg-gray-50 transition-colors
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
            {new Date(date).getDate()}
          </span>
          {isCurrentMonth && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddRecipe}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>

        {mealPlanEntries.length > 0 && (
          <div className="space-y-1">
            {mealPlanEntries.slice(0, 2).map((entry, index) => (
              <div key={index} className="flex items-center space-x-1">
                <ChefHat className="w-3 h-3 text-orange-500 flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate">
                  {entry.title}
                </span>
                {entry.servings_override && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {entry.servings_override}
                  </Badge>
                )}
              </div>
            ))}
            {mealPlanEntries.length > 2 && (
              <div className="text-xs text-gray-500">
                +{mealPlanEntries.length - 2} more
              </div>
            )}
          </div>
        )}

        {isCurrentMonth && mealPlanEntries.length === 0 && (
          <div className="text-xs text-gray-400 mt-2">
            Click + to add recipes
          </div>
        )}
      </div>

      <MealPlanModal
        isOpen={showMealPlanModal}
        onClose={() => setShowMealPlanModal(false)}
        selectedDate={date}
        onSuccess={handleMealPlanSuccess}
      />
    </>
  );
}
