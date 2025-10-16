'use client'

import { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Lazy load heavy components
const PaprikaUploader = lazy(() => import('./PaprikaUploader'))
const RecipePreview = lazy(() => import('./RecipePreview'))
const ImportForm = lazy(() => import('./ImportForm'))

// Loading component
function ImportLoading() {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm text-gray-600">Loading import tools...</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Wrapper components with Suspense
export function LazyPaprikaUploader(props: any) {
  return (
    <Suspense fallback={<ImportLoading />}>
      <PaprikaUploader {...props} />
    </Suspense>
  )
}

export function LazyRecipePreview(props: any) {
  return (
    <Suspense fallback={<ImportLoading />}>
      <RecipePreview {...props} />
    </Suspense>
  )
}

export function LazyImportForm(props: any) {
  return (
    <Suspense fallback={<ImportLoading />}>
      <ImportForm {...props} />
    </Suspense>
  )
}
