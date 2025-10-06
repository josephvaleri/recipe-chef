const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function detailedCheck() {
  try {
    console.log('🔍 Detailed Recipe Chef database check...\n')

    // Check if ouioui_lines table exists and has data
    console.log('1. Checking ouioui_lines table...')
    const { data: ouiouiData, error: ouiouiError } = await supabase
      .from('ouioui_lines')
      .select('*')
      .limit(5)

    if (ouiouiError) {
      console.error('❌ Error with ouioui_lines table:', ouiouiError.message)
      return
    }

    console.log(`✅ ouioui_lines table exists with ${ouiouiData.length} rows`)
    if (ouiouiData.length > 0) {
      console.log('📝 Sample data:')
      ouiouiData.forEach(line => {
        console.log(`   ${line.type}: "${line.text}"`)
      })
    }

    // Try to call the RPC function directly
    console.log('\n2. Testing get_random_ouioui_line RPC function...')
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_random_ouioui_line', { line_type: 'greeting', locale: 'en' })

      if (rpcError) {
        console.error('❌ RPC function error:', rpcError.message)
        console.log('💡 This might be a permissions issue. Let me try with different parameters...')
        
        // Try with just the required parameter
        const { data: rpcData2, error: rpcError2 } = await supabase
          .rpc('get_random_ouioui_line', { line_type: 'greeting' })

        if (rpcError2) {
          console.error('❌ RPC function still failing:', rpcError2.message)
        } else {
          console.log('✅ RPC function works with minimal parameters:', rpcData2)
        }
      } else {
        console.log('✅ RPC function works! Result:', rpcData)
      }
    } catch (rpcErr) {
      console.error('❌ RPC function exception:', rpcErr.message)
    }

    // Check if we can query the data manually
    console.log('\n3. Testing manual data retrieval...')
    const { data: greetingData, error: greetingError } = await supabase
      .from('ouioui_lines')
      .select('text')
      .eq('type', 'greeting')
      .eq('locale', 'en')
      .limit(1)

    if (greetingError) {
      console.error('❌ Manual query error:', greetingError.message)
    } else {
      console.log('✅ Manual query works! Sample greeting:', greetingData[0]?.text || 'No data')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

detailedCheck()
