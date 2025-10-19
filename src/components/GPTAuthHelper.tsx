'use client'

import { useState } from 'react'
import { getGPTAuthDetails, copyGPTAuthToClipboard, generateGPTShareLink } from '@/lib/gpt-auth-helper'

interface GPTAuthHelperProps {
  className?: string
}

export default function GPTAuthHelper({ className = '' }: GPTAuthHelperProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [authDetails, setAuthDetails] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleGetAuthDetails = async () => {
    setIsLoading(true)
    try {
      const details = await getGPTAuthDetails()
      if (details) {
        setAuthDetails(details)
        setShowDetails(true)
      } else {
        alert('Please sign in to RecipeChef first to get your authentication details.')
      }
    } catch (error) {
      console.error('Error getting auth details:', error)
      alert('Failed to get authentication details. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyToClipboard = async () => {
    setIsLoading(true)
    try {
      const success = await copyGPTAuthToClipboard()
      if (success) {
        // Success message is handled in the function
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Failed to copy to clipboard. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateShareLink = async () => {
    setIsLoading(true)
    try {
      const shareLink = await generateGPTShareLink()
      if (shareLink) {
        await navigator.clipboard.writeText(shareLink)
        alert('Shareable link copied to clipboard! You can use this link with the RecipeChef Importer GPT.')
      } else {
        alert('Please sign in to RecipeChef first to generate a shareable link.')
      }
    } catch (error) {
      console.error('Error generating share link:', error)
      alert('Failed to generate shareable link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🤖 RecipeChef Importer GPT
      </h3>
      
      <p className="text-gray-600 mb-4">
        Get your authentication details to save recipes directly to your RecipeChef account using the RecipeChef Importer GPT.
      </p>

      <div className="space-y-3">
        <button
          onClick={handleGetAuthDetails}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Getting Details...' : 'Get Authentication Details'}
        </button>

        <button
          onClick={handleCopyToClipboard}
          disabled={isLoading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Copying...' : 'Copy Details to Clipboard'}
        </button>

        <button
          onClick={handleGenerateShareLink}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : 'Generate Shareable Link'}
        </button>
      </div>

      {showDetails && authDetails && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Your Authentication Details:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">User ID:</span>
              <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">
                {authDetails.user_id}
              </code>
            </div>
            <div>
              <span className="font-medium">Auth Token:</span>
              <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs break-all">
                {authDetails.auth_token.substring(0, 20)}...
              </code>
            </div>
            <div>
              <span className="font-medium">Expires:</span>
              <span className="ml-2 text-gray-600">
                {new Date(authDetails.expires_at).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>How to use:</strong> Copy these details and paste them into the RecipeChef Importer GPT when importing recipes. 
              The GPT will use them to save recipes directly to your RecipeChef account.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 rounded-md">
        <h4 className="font-medium text-yellow-800 mb-2">📋 Instructions:</h4>
        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
          <li>Click "Get Authentication Details" to retrieve your credentials</li>
          <li>Copy the details to your clipboard</li>
          <li>Go to ChatGPT and find the "RecipeChef Importer" GPT</li>
          <li>When importing a recipe, paste your authentication details</li>
          <li>The recipe will be saved directly to your RecipeChef account!</li>
        </ol>
      </div>
    </div>
  )
}
