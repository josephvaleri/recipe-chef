'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, ChefHat, Loader2 } from 'lucide-react'
import { getCurrentUser, getCurrentProfile, isAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface UploadedFile {
  file: File
  type: 'paprika' | 'csv'
  status: 'pending' | 'processing' | 'success' | 'error'
  message?: string
  recipesProcessed?: number
}

export default function BulkUploadPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const currentProfile = await getCurrentProfile()
      
      if (!currentUser || !currentProfile) {
        router.push('/auth/signin')
        return
      }

      if (!isAdmin(currentProfile)) {
        router.push('/')
        return
      }

      setUser(currentUser)
      setProfile(currentProfile)
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/auth/signin')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      type: file.name.endsWith('.paprikarecipes') || file.name.endsWith('.paprikarecipe') ? 'paprika' : 'csv',
      status: 'pending'
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processFile = async (uploadedFile: UploadedFile): Promise<UploadedFile> => {
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile.file)
      formData.append('type', uploadedFile.type)

      const response = await fetch('/api/admin/global-recipes/bulk-upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        return {
          ...uploadedFile,
          status: 'success',
          message: `Successfully processed ${result.recipesProcessed || 0} recipes`,
          recipesProcessed: result.recipesProcessed || 0
        }
      } else {
        return {
          ...uploadedFile,
          status: 'error',
          message: result.error || 'Upload failed'
        }
      }
    } catch (error) {
      return {
        ...uploadedFile,
        status: 'error',
        message: 'Network error during upload'
      }
    }
  }

  const handleBulkUpload = async () => {
    if (uploadedFiles.length === 0) return

    setIsUploading(true)
    
    // Update all files to processing status
    setUploadedFiles(prev => prev.map(file => ({ ...file, status: 'processing' as const })))

    // Process files sequentially
    for (let i = 0; i < uploadedFiles.length; i++) {
      const updatedFile = await processFile(uploadedFiles[i])
      setUploadedFiles(prev => prev.map((file, index) => index === i ? updatedFile : file))
    }

    setIsUploading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-pulse" />
          <p className="text-orange-700">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-orange-900">Bulk Upload Recipes</h1>
              <p className="text-orange-700">Upload multiple recipes from .paprikarecipes or CSV files</p>
            </div>
          </div>

          {/* Upload Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-orange-600" />
                <span>Select Files</span>
              </CardTitle>
              <CardDescription>
                Choose .paprikarecipes or CSV files to upload
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".paprikarecipe,.paprikarecipes,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  Drop files here or click to browse
                </h3>
                <p className="text-orange-600 mb-4">
                  Supports .paprikarecipe, .paprikarecipes, and .csv files
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200 mb-6">
              <CardHeader>
                <CardTitle>Selected Files ({uploadedFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(file.status)}
                        <div>
                          <p className="font-medium text-orange-900">{file.file.name}</p>
                          <p className="text-sm text-orange-600">
                            {file.type === 'paprika' ? 'Paprika Recipe' : 'CSV File'} • 
                            {(file.file.size / 1024).toFixed(1)} KB
                          </p>
                          {file.message && (
                            <p className="text-xs text-orange-600 mt-1">{file.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(file.status)}>
                          {file.status}
                        </Badge>
                        {file.status === 'pending' && (
                          <Button
                            onClick={() => removeFile(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {uploadedFiles.some(f => f.status === 'pending') && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleBulkUpload}
                      disabled={isUploading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {isUploading ? 'Processing...' : 'Upload All Files'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardHeader>
              <CardTitle>Upload Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-orange-900 mb-2">Supported Formats</h4>
                  <ul className="space-y-1 text-sm text-orange-700">
                    <li>• <strong>.paprikarecipe</strong> - Individual Paprika Recipe Manager recipe files</li>
                    <li>• <strong>.paprikarecipes</strong> - Paprika Recipe Manager export files (multiple recipes)</li>
                    <li>• <strong>.csv</strong> - Comma-separated values with recipe data</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-orange-900 mb-2">CSV Format Requirements</h4>
                  <p className="text-sm text-orange-700 mb-2">
                    CSV files should include the following columns:
                  </p>
                  <ul className="space-y-1 text-sm text-orange-600 ml-4">
                    <li>• title, description, prep_time, cook_time, servings, difficulty</li>
                    <li>• cuisine_id, meal_type_id, image_url</li>
                    <li>• ingredients (JSON format with name, amount, unit)</li>
                    <li>• steps (JSON format with step_number, text)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
