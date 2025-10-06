'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ImportResult {
  imported: number;
  total: number;
  errors: number;
  duplicates: number;
  names: string[];
  results: Array<{
    title: string;
    success: boolean;
    error?: string;
    skipped?: boolean;
  }>;
}

export default function PaprikaUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<{ current: number; total: number; percentage: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);
    setProgress(null);

    // Start progress simulation
    const startTime = Date.now();
    const estimatedTotal = Math.max(100, Math.floor(file.size / 10000)); // Rough estimate based on file size
    let currentProgress = 0;
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const estimatedProgress = Math.min(95, Math.floor((elapsed / 30000) * 100)); // Assume 30 seconds for 95%
      
      if (estimatedProgress > currentProgress) {
        currentProgress = estimatedProgress;
        setProgress({
          current: Math.floor((estimatedProgress / 100) * estimatedTotal),
          total: estimatedTotal,
          percentage: estimatedProgress
        });
      }
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get user ID from session
      const { getCurrentUser } = await import('@/lib/auth');
      const user = await getCurrentUser();
      
      if (!user) {
        throw new Error('Please sign in to import recipes');
      }
      
      formData.append('userId', user.id);

      console.log('Starting Paprika import...');
      
      const response = await fetch('/api/import-paprika', {
        method: 'POST',
        body: formData,
      });

      console.log('Import response received:', response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      console.log('Import completed:', data);
      
      // Set final progress to 100%
      setProgress({
        current: data.total || estimatedTotal,
        total: data.total || estimatedTotal,
        percentage: 100
      });
      
      setResult(data);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      // Keep progress visible for a moment before clearing
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-orange-500" />
          <span>Import from Paprika</span>
        </CardTitle>
        <CardDescription>
          Upload .paprikarecipe (single recipe) or .paprikarecipes (multiple recipes) files from Paprika App.
          Each .paprikarecipe file is a ZIP archive containing the recipe data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Paprika Recipe File
              </label>
              <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                <input
                  type="file"
                  accept=".paprikarecipe,.paprikarecipes"
                  onChange={handleFileChange}
                  className="hidden"
                  id="paprika-file-input"
                />
                <label htmlFor="paprika-file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 mb-1">
                    Click to upload Paprika file
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports .paprikarecipe, .paprikarecipes files
                  </p>
                </label>
              </div>
              {file && (
                <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                  <p className="text-sm text-orange-700">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {file.name}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Recipes... (This may take a few minutes)
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Recipes
                </>
              )}
            </Button>

            {loading && progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>{progress.percentage}% ({progress.current}/{progress.total})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  Processing recipes... This may take several minutes for large files.
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> In Paprika App, you can export individual recipes (.paprikarecipe) or all recipes (.paprikarecipes). 
                Each .paprikarecipe file is a ZIP archive containing JSON data - we'll automatically extract them.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-800">
                  Import Complete!
                </span>
              </div>
              <div className="text-sm text-green-700">
                <p>Successfully imported: {result.imported} of {result.total} recipes</p>
                {result.errors > 0 && (
                  <p className="text-red-600">Failed: {result.errors} recipes</p>
                )}
              </div>
            </div>

            {result.names.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Imported Recipes ({result.names.length})</h4>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  <ul className="text-sm space-y-1">
                    {result.names.slice(0, 50).map((name, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span>{name}</span>
                      </li>
                    ))}
                    {result.names.length > 50 && (
                      <li className="text-gray-500 text-xs">
                        ... and {result.names.length - 50} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {result.results.some(r => !r.success) && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Failed Recipes</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.results
                    .filter(r => !r.success)
                    .map((recipe, index) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <div className="font-medium">{recipe.title}</div>
                        <div className="text-red-500">{recipe.error}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Button onClick={reset} variant="outline" className="w-full">
              <X className="w-4 h-4 mr-2" />
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
