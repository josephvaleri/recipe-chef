'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Printer, Volume2, Copy, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ShoppingListGeneratorProps {
  onGenerate: (params: { start: string; days: number; people: number }) => void;
  loading?: boolean;
}

export function ShoppingListGenerator({ onGenerate, loading = false }: ShoppingListGeneratorProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [days, setDays] = useState(7);
  const [people, setPeople] = useState(4);

  const handleGenerate = () => {
    onGenerate({
      start: startDate,
      days,
      people
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-orange-500" />
          <span>Generate Shopping List</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="days">Days</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="people">People</Label>
            <Input
              id="people"
              type="number"
              min="1"
              max="20"
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
        
        <Button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Generate Shopping List
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ShoppingListDisplayProps {
  shoppingList: { [category: string]: any[] };
  startDate: string;
  days: number;
  people: number;
  onPrint: () => void;
  onPushToAlexa: () => void;
  onCopy: () => void;
  loading?: boolean;
}

export function ShoppingListDisplay({ 
  shoppingList, 
  startDate, 
  days, 
  people, 
  onPrint, 
  onPushToAlexa, 
  onCopy,
  loading = false 
}: ShoppingListDisplayProps) {
  const totalItems = Object.values(shoppingList).flat().length;

  if (Object.keys(shoppingList).length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No items in your shopping list</h3>
          <p className="text-gray-600">Add recipes to your calendar to generate a shopping list</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <span>Shopping List</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button onClick={onCopy} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button onClick={onPrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <Button onClick={onPushToAlexa} variant="outline" size="sm" disabled={loading}>
              <Volume2 className="w-4 h-4 mr-1" />
              {loading ? 'Pushing...' : 'Alexa'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {days} days • {people} people • {totalItems} items
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(shoppingList).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                {category}
              </h3>
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={`${item.ingredient_id}-${index}`} className="flex items-center py-1">
                    <input 
                      type="checkbox" 
                      className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{item.ingredient_name}</span>
                      {item.quantity && (
                        <span className="text-gray-600 ml-2">
                          — {item.quantity} {item.unit}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
