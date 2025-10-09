'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface ShoppingListItem {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
}

interface ShoppingListData {
  [category: string]: ShoppingListItem[];
}

function SearchParamsHandler({ onParamsReady }: { onParamsReady: (params: { start: string; days: string; people: string }) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const start = searchParams.get('start');
    const days = searchParams.get('days') || '7';
    const people = searchParams.get('people') || '4';
    
    if (start) {
      onParamsReady({ start, days, people });
    }
  }, [searchParams, onParamsReady]);

  return null;
}

function ShoppingListPrintPageContent() {
  const [shoppingList, setShoppingList] = useState<ShoppingListData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<{ start: string; days: string; people: string } | null>(null);

  useEffect(() => {
    if (!params) {
      return;
    }

    if (!params.start) {
      setError('Missing start date');
      setLoading(false);
      return;
    }

    const fetchShoppingList = async () => {
      try {
        const response = await fetch(
          `/api/shopping-list/generate?start=${params.start}&days=${params.days}&people=${params.people}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to generate shopping list');
        }
        
        const data = await response.json();
        setShoppingList(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchShoppingList();
  }, [params]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Generating shopping list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const totalItems = Object.values(shoppingList).flat().length;

  return (
    <div className="min-h-screen bg-white">
      <SearchParamsHandler onParamsReady={setParams} />
      {/* Print controls - hidden when printing */}
      <div className="print:hidden bg-gray-50 border-b p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Shopping List</h1>
            <p className="text-sm text-gray-600">
              {params?.days} days • {params?.people} people • {totalItems} items
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Shopping list content */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="print:block">
          <div className="text-center mb-8 print:mb-4">
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Shopping List</h1>
            <p className="text-gray-600 print:text-sm">
              {params && new Date(params.start).toLocaleDateString()} • {params?.days} days • {params?.people} people
            </p>
          </div>

          {Object.keys(shoppingList).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No items in your shopping list</p>
              <p className="text-sm text-gray-400">Add recipes to your calendar to generate a shopping list</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(shoppingList).map(([category, items]) => (
                <div key={category} className="break-inside-avoid">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 print:text-lg print:mb-2 border-b border-gray-200 pb-2">
                    {category}
                  </h2>
                  <ul className="space-y-2">
                    {items.map((item, index) => (
                      <li key={`${item.ingredient_id}-${index}`} className="flex items-center py-1">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded print:hidden"
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
          )}

          <div className="mt-8 pt-4 border-t border-gray-200 print:mt-4 print:pt-2">
            <p className="text-sm text-gray-500 text-center">
              Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:text-2xl {
            font-size: 1.5rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
          }
          
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
          
          .print\\:pt-2 {
            padding-top: 0.5rem !important;
          }
          
          .print\\:hidden input[type="checkbox"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ShoppingListPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ShoppingListPrintPageContent />
    </Suspense>
  );
}
