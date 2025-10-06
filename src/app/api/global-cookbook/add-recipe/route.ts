import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET() {
  return NextResponse.json({ 
    message: 'Global cookbook API is working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('=== GLOBAL COOKBOOK API DEBUG START ===')
  console.log('Request method:', request.method)
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    console.log('Global cookbook API: Starting request')
    
    // Parse request body with detailed logging
    let requestBody
    try {
      requestBody = await request.json()
      console.log('Global cookbook API: Request body parsed successfully:', requestBody)
    } catch (parseError) {
      console.error('Global cookbook API: Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 })
    }
    
    const { user_recipe_id } = requestBody
    console.log('Global cookbook API: Received user_recipe_id:', user_recipe_id)
    console.log('Global cookbook API: user_recipe_id type:', typeof user_recipe_id)

    if (!user_recipe_id) {
      console.log('Global cookbook API: No user_recipe_id provided')
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }

    // Test Supabase connection
    console.log('Global cookbook API: Testing Supabase connection...')
    let supabase
    try {
      supabase = await createServerClient()
      console.log('Global cookbook API: Supabase client created successfully')
      
      // Debug: Check what cookies are available
      const cookieStore = await cookies()
      const allCookies = cookieStore.getAll()
      console.log('Global cookbook API: Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
      
      // Try to manually set the session from the cookie
      const authCookie = allCookies.find(c => c.name === 'sb-avlqlppqteqjfsnlitiz-auth-token')
      if (authCookie && authCookie.value) {
        try {
          // Decode the base64 cookie value
          let decodedValue = authCookie.value
          if (authCookie.value.startsWith('base64-')) {
            decodedValue = Buffer.from(authCookie.value.substring(7), 'base64').toString('utf-8')
            console.log('Global cookbook API: Decoded cookie value (first 100 chars):', decodedValue.substring(0, 100))
          }
          
          // Parse the decoded JSON
          const sessionData = JSON.parse(decodedValue)
          console.log('Global cookbook API: Parsed session data keys:', Object.keys(sessionData))
          
          // Try to set the session manually with just the access token
          const { data: sessionResult, error: sessionError } = await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token || 'dummy_refresh_token'
          })
          
          // If that fails, try using the access token directly
          if (sessionError) {
            console.log('Global cookbook API: First attempt failed, trying direct access token...')
            const { data: directResult, error: directError } = await supabase.auth.setSession({
              access_token: sessionData.access_token
            })
            console.log('Global cookbook API: Direct access token result:', {
              hasSession: !!directResult.session,
              hasUser: !!directResult.user,
              error: directError?.message
            })
          }
          
          // Try to create a new Supabase client with the access token
          if (sessionError) {
            console.log('Global cookbook API: Creating new Supabase client with access token...')
            const { createClient } = await import('@supabase/supabase-js')
            const supabaseWithToken = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                global: {
                  headers: {
                    Authorization: `Bearer ${sessionData.access_token}`
                  }
                }
              }
            )
            
            // Test this client
            const { data: tokenUser, error: tokenError } = await supabaseWithToken.auth.getUser()
            console.log('Global cookbook API: Token-based client result:', {
              hasUser: !!tokenUser.user,
              userId: tokenUser.user?.id,
              error: tokenError?.message
            })
            
            // Use this client for the database query
            if (tokenUser.user) {
              console.log('Global cookbook API: Using token-based client for database query...')
              const { data: tokenTestData, error: tokenTestError } = await supabaseWithToken
                .from('user_recipes')
                .select('user_recipe_id, title, user_id')
                .eq('user_recipe_id', user_recipe_id)
                .limit(1)
              
              console.log('Global cookbook API: Token-based query result:', {
                hasData: !!tokenTestData,
                dataLength: tokenTestData?.length,
                error: tokenTestError?.message
              })
              
              if (tokenTestData && tokenTestData.length > 0) {
                console.log('Global cookbook API: SUCCESS! Recipe found with token-based client')
                return NextResponse.json({
                  success: true,
                  message: 'Recipe found using token-based authentication',
                  user_recipe_id: user_recipe_id,
                  recipe_title: tokenTestData[0].title,
                  method: 'token-based',
                  timestamp: new Date().toISOString()
                })
              }
            }
          }
          console.log('Global cookbook API: Manual session set result:', {
            hasSession: !!sessionResult.session,
            hasUser: !!sessionResult.user,
            error: sessionError?.message
          })
        } catch (sessionError) {
          console.log('Global cookbook API: Failed to set session manually:', sessionError)
        }
      }
      
      // Check authentication on server side
      const { data: { user: serverUser }, error: serverAuthError } = await supabase.auth.getUser()
      console.log('Global cookbook API: Server-side auth check:', {
        hasUser: !!serverUser,
        userId: serverUser?.id,
        userEmail: serverUser?.email,
        authError: serverAuthError?.message
      })
      
      // Check for Supabase auth cookies specifically
      const supabaseCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
      console.log('Global cookbook API: Supabase cookies:', supabaseCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
      
      // Debug: Check the actual cookie value
      if (authCookie) {
        console.log('Global cookbook API: Auth cookie value (first 100 chars):', authCookie.value?.substring(0, 100))
        console.log('Global cookbook API: Auth cookie value length:', authCookie.value?.length)
      }
    } catch (supabaseError) {
      console.error('Global cookbook API: Failed to create Supabase client:', supabaseError)
      return NextResponse.json({ 
        error: 'Failed to create Supabase client',
        details: supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error'
      }, { status: 500 })
    }

    // Test basic database query with detailed logging
    console.log('Global cookbook API: Executing database query...')
    console.log('Global cookbook API: Query details:', {
      table: 'user_recipes',
      select: 'user_recipe_id, title',
      where: `user_recipe_id = ${user_recipe_id}`,
      limit: 1
    })
    
    // First, let's check if the recipe exists at all (with RLS)
    const { data: testData, error: testError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, user_id')
      .eq('user_recipe_id', user_recipe_id)
      .limit(1)
    
    // Also try a broader query to see what recipes are visible
    const { data: allRecipes, error: allRecipesError } = await supabase
      .from('user_recipes')
      .select('user_recipe_id, title, user_id')
      .limit(5)
    
    console.log('Global cookbook API: All visible recipes (first 5):', allRecipes)
    console.log('Global cookbook API: All recipes query error:', allRecipesError)

    console.log('Global cookbook API: Database query completed')
    console.log('Global cookbook API: Query result data:', testData)
    console.log('Global cookbook API: Query result error:', testError)
    console.log('Global cookbook API: Data length:', testData?.length)
    console.log('Global cookbook API: First item:', testData?.[0])

    if (testError) {
      console.log('Global cookbook API: Database query failed, returning 500')
      return NextResponse.json({ 
        error: 'Database query failed',
        details: testError.message,
        code: testError.code,
        hint: testError.hint
      }, { status: 500 })
    }

    if (!testData || testData.length === 0) {
      console.log('Global cookbook API: No recipe found, returning 404')
      return NextResponse.json({ 
        error: 'Recipe not found',
        user_recipe_id: user_recipe_id,
        searched_for: user_recipe_id,
        data_returned: testData
      }, { status: 404 })
    }

    console.log('Global cookbook API: Recipe found, returning success')
    const response = {
      success: true,
      message: 'Recipe found and database connection working',
      user_recipe_id: user_recipe_id,
      recipe_title: testData[0].title,
      timestamp: new Date().toISOString()
    }
    console.log('Global cookbook API: Response being sent:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Global cookbook API: Unexpected error:', error)
    console.error('Global cookbook API: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  } finally {
    console.log('=== GLOBAL COOKBOOK API DEBUG END ===')
  }
}