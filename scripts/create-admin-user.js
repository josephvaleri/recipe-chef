const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminUser() {
  try {
    console.log('Creating admin user...')
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'josephvaleri@gmail.com',
      password: 'M0nt3F@lc0!',
      email_confirm: true, // Auto-confirm the email
    })

    if (authError) {
      console.error('Error creating user in auth:', authError)
      return
    }

    console.log('User created in auth:', authData.user.id)

    // Create profile with admin role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        full_name: 'Joseph Valeri',
        role: 'admin',
        status: 'active',
        has_ai_subscription: true,
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return
    }

    console.log('✅ Admin user created successfully!')
    console.log('Email: josephvaleri@gmail.com')
    console.log('Password: M0nt3F@lc0!')
    console.log('Role: admin')
    console.log('Status: active')
    console.log('AI Subscription: enabled')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createAdminUser()
