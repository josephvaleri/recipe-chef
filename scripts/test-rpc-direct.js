const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRPC() {
  try {
    console.log('🧪 Testing RPC function directly...\n')

    // Test with the new parameter names
    console.log('Testing with p_type and p_locale parameters:')
    
    const { data: greetingData, error: greetingError } = await supabase
      .rpc('get_random_ouioui_line', { p_type: 'greeting', p_locale: 'en' })
    
    console.log('Greeting result:', greetingData)
    console.log('Greeting error:', greetingError)

    const { data: jokeData, error: jokeError } = await supabase
      .rpc('get_random_ouioui_line', { p_type: 'joke', p_locale: 'en' })
    
    console.log('Joke result:', jokeData)
    console.log('Joke error:', jokeError)

    const { data: tipData, error: tipError } = await supabase
      .rpc('get_random_ouioui_line', { p_type: 'tip', p_locale: 'en' })
    
    console.log('Tip result:', tipData)
    console.log('Tip error:', tipError)

    // Also test without locale parameter
    console.log('\nTesting without locale parameter:')
    
    const { data: greetingData2, error: greetingError2 } = await supabase
      .rpc('get_random_ouioui_line', { p_type: 'greeting' })
    
    console.log('Greeting (no locale) result:', greetingData2)
    console.log('Greeting (no locale) error:', greetingError2)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testRPC()
