'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RouteGuard } from '@/components/route-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Globe, 
  ChefHat, 
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'

interface GlobalCandidate {
  candidate_id: number
  submitted_by: string
  data: any
  source: string
  allow_global: boolean
  status: 'pending' | 'approved' | 'rejected'
  moderator_id?: string
  decision_reason?: string
  created_at: string
  decided_at?: string
  submitter: {
    full_name?: string
    user_id: string
  }
}

export default function ModeratorPage() {
  const [candidates, setCandidates] = useState<GlobalCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<GlobalCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [decisionReason, setDecisionReason] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
    loadCandidates()
  }, [])

  const loadProfile = async () => {
    const profileData = await getCurrentProfile()
    setProfile(profileData)
  }

  const loadCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('global_candidates')
        .select(`
          *,
          submitter:profiles!global_candidates_submitted_by_fkey(full_name, user_id)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading candidates:', error)
        return
      }

      setCandidates(data || [])
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (candidate: GlobalCandidate) => {
    setProcessing(true)
    
    try {
      const user = await getCurrentUser()
      if (!user) return

      // Validate recipe data
      const recipeData = candidate.data
      if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
        alert('Invalid recipe data: missing required fields')
        return
      }

      // Create global recipe
      const { data: globalRecipe, error: recipeError } = await supabase
        .from('global_recipes')
        .insert({
          title: recipeData.title,
          description: recipeData.description || null,
          image_url: recipeData.image || null,
          servings: recipeData.servings || null,
          difficulty: recipeData.difficulty || 'Easy',
          prep_time: recipeData.prepTime || null,
          cook_time: recipeData.cookTime || null,
          source_name: recipeData.sourceName || candidate.source || 'User Submission',
          source_url: recipeData.sourceUrl || null,
          created_by: candidate.submitted_by,
          is_published: true
        })
        .select()
        .single()

      if (recipeError) {
        console.error('Error creating global recipe:', recipeError)
        alert('Failed to create global recipe')
        return
      }

      // Create ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredients = recipeData.ingredients.map((ing: any) => ({
          recipe_id: globalRecipe.recipe_id,
          amount: ing.amount || null,
          unit: ing.unit || null,
          raw_name: ing.name || ing.raw_name || ''
        }))

        const { error: ingredientsError } = await supabase
          .from('global_recipe_ingredients')
          .insert(ingredients)

        if (ingredientsError) {
          console.error('Error creating ingredients:', ingredientsError)
        }
      }

      // Create steps
      if (recipeData.instructions && recipeData.instructions.length > 0) {
        const steps = recipeData.instructions.map((inst: string, index: number) => ({
          recipe_id: globalRecipe.recipe_id,
          step_number: index + 1,
          text: inst
        }))

        const { error: stepsError } = await supabase
          .from('global_recipe_steps')
          .insert(steps)

        if (stepsError) {
          console.error('Error creating steps:', stepsError)
        }
      }

      // Update candidate status
      const { error: updateError } = await supabase
        .from('global_candidates')
        .update({
          status: 'approved',
          moderator_id: user.id,
          decision_reason: decisionReason || 'Approved by moderator',
          decided_at: new Date().toISOString()
        })
        .eq('candidate_id', candidate.candidate_id)

      if (updateError) {
        console.error('Error updating candidate:', updateError)
        alert('Failed to update candidate status')
        return
      }

      // Reload candidates
      await loadCandidates()
      setSelectedCandidate(null)
      setDecisionReason('')
      
      alert('Recipe approved and added to global cookbook!')

    } catch (error) {
      console.error('Error approving candidate:', error)
      alert('Failed to approve recipe')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (candidate: GlobalCandidate) => {
    setProcessing(true)
    
    try {
      const user = await getCurrentUser()
      if (!user) return

      if (!decisionReason.trim()) {
        alert('Please provide a reason for rejection')
        return
      }

      const { error } = await supabase
        .from('global_candidates')
        .update({
          status: 'rejected',
          moderator_id: user.id,
          decision_reason: decisionReason,
          decided_at: new Date().toISOString()
        })
        .eq('candidate_id', candidate.candidate_id)

      if (error) {
        console.error('Error rejecting candidate:', error)
        alert('Failed to reject recipe')
        return
      }

      // Reload candidates
      await loadCandidates()
      setSelectedCandidate(null)
      setDecisionReason('')
      
      alert('Recipe rejected')

    } catch (error) {
      console.error('Error rejecting candidate:', error)
      alert('Failed to reject recipe')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-orange-700">Loading moderation queue...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen" style={{ backgroundColor: '#C6DBEF' }}>
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-orange-900 flex items-center">
                <Shield className="w-8 h-8 mr-3" />
                Recipe Moderation
              </h1>
              <p className="text-orange-700 mt-2">
                Review and approve recipes for the global cookbook
              </p>
            </div>
            <Badge className="bg-orange-100 text-orange-800">
              {candidates.length} pending
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Candidates List */}
            <div className="lg:col-span-1">
              <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                <CardHeader>
                  <CardTitle>Pending Reviews</CardTitle>
                  <CardDescription>
                    Recipes waiting for moderation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AnimatePresence>
                    {candidates.map((candidate) => (
                      <motion.div
                        key={candidate.candidate_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCandidate?.candidate_id === candidate.candidate_id
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-200 bg-gray-50 hover:border-orange-200'
                        }`}
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {candidate.data.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <User className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                {candidate.submitter?.full_name || 'Unknown User'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                {formatDate(candidate.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {candidate.data.ingredients?.length || 0} ingredients
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {candidate.data.instructions?.length || 0} steps
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {candidates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p>No pending reviews! 🎉</p>
                      <p className="text-sm">All recipes have been moderated</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recipe Review */}
            <div className="lg:col-span-2">
              {selectedCandidate ? (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Eye className="w-5 h-5 mr-2 text-orange-500" />
                          Review Recipe
                        </CardTitle>
                        <CardDescription>
                          Submitted by {selectedCandidate.submitter?.full_name || 'Unknown User'}
                        </CardDescription>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">
                        {formatDate(selectedCandidate.created_at)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Recipe Header */}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedCandidate.data.title}
                        </h2>
                        {selectedCandidate.data.description && (
                          <p className="text-gray-600 mt-2">
                            {selectedCandidate.data.description}
                          </p>
                        )}
                      </div>

                      {/* Recipe Image */}
                      {selectedCandidate.data.image && (
                        <div className="flex justify-center">
                          <img
                            src={selectedCandidate.data.image}
                            alt={selectedCandidate.data.title}
                            className="w-64 h-48 object-cover rounded-lg shadow-md"
                          />
                        </div>
                      )}

                      {/* Recipe Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedCandidate.data.prepTime && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              <strong>Prep:</strong> {selectedCandidate.data.prepTime}
                            </span>
                          </div>
                        )}
                        {selectedCandidate.data.cookTime && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              <strong>Cook:</strong> {selectedCandidate.data.cookTime}
                            </span>
                          </div>
                        )}
                        {selectedCandidate.data.servings && (
                          <div className="flex items-center space-x-2">
                            <ChefHat className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              <strong>Serves:</strong> {selectedCandidate.data.servings}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Ingredients</h3>
                      <div className="space-y-2">
                        {selectedCandidate.data.ingredients?.map((ing: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">
                              {ing.amount} {ing.unit}
                            </span>
                            <span className="text-sm text-gray-700">
                              {ing.name || ing.raw_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
                      <div className="space-y-3">
                        {selectedCandidate.data.instructions?.map((inst: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <p className="text-sm text-gray-700">{inst}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Source Information */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          <strong>Source:</strong> {selectedCandidate.source || 'Unknown'}
                        </span>
                      </div>
                      {selectedCandidate.data.sourceUrl && (
                        <div className="mt-1">
                          <a
                            href={selectedCandidate.data.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-orange-600 hover:text-orange-700 underline"
                          >
                            View original recipe
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Decision Section */}
                    <div className="pt-6 border-t border-gray-200 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Decision Reason (optional for approval, required for rejection)
                        </label>
                        <Textarea
                          placeholder="Add notes about your decision..."
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          className="border-orange-300 focus:border-orange-500"
                          rows={3}
                        />
                      </div>

                      <div className="flex space-x-4">
                        <Button
                          onClick={() => handleReject(selectedCandidate)}
                          disabled={processing}
                          className="bg-red-600 hover:bg-red-700 flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {processing ? 'Rejecting...' : 'Reject'}
                        </Button>
                        <Button
                          onClick={() => handleApprove(selectedCandidate)}
                          disabled={processing}
                          className="bg-green-600 hover:bg-green-700 flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {processing ? 'Approving...' : 'Approve'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                  <CardContent className="p-12 text-center">
                    <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Select a Recipe to Review
                    </h3>
                    <p className="text-gray-600">
                      Choose a recipe from the list to start the moderation process
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </RouteGuard>
  )
}
