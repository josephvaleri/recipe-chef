'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function SignInTestPage() {
  const [email, setEmail] = useState('josephvaleri@gmail.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const signIn = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('Starting sign in...')
      console.log('Cookies before sign in:', document.cookie)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      console.log('Sign in result:', { data, error })
      console.log('Cookies after sign in:', document.cookie)
      
      if (error) {
        setResult({ type: 'error', message: error.message })
      } else {
        setResult({ 
          type: 'success', 
          message: 'Sign in successful!',
          user: data.user,
          session: data.session
        })
        
        // Check session after a delay
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          console.log('Session after delay:', session)
          setResult(prev => ({ ...prev, sessionAfterDelay: session }))
        }, 1000)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setResult({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current session:', session)
    console.log('Current user:', user)
    setResult({ 
      type: 'info', 
      session, 
      user,
      cookies: document.cookie
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔐 Sign-In Test</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Form</CardTitle>
            <CardDescription>
              Test sign-in with detailed logging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="space-x-4">
              <Button onClick={signIn} disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button onClick={checkSession} variant="outline">
                Check Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className={result.type === 'error' ? 'text-red-600' : result.type === 'success' ? 'text-green-600' : 'text-blue-600'}>
                {result.type === 'error' ? '❌ Error' : result.type === 'success' ? '✅ Success' : 'ℹ️ Info'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>{result.message}</p>
                
                {result.user && (
                  <div>
                    <h4 className="font-semibold">User:</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.user, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.session && (
                  <div>
                    <h4 className="font-semibold">Session:</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.session, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.cookies && (
                  <div>
                    <h4 className="font-semibold">Cookies:</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {result.cookies}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>
              How to use this test page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Enter your email and password above</li>
              <li>Click "Sign In" and watch the browser console for logs</li>
              <li>Check the result below to see what happened</li>
              <li>Click "Check Session" to see current auth state</li>
              <li>Look for cookie setting/getting logs in the console</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
