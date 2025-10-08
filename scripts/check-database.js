const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabase() {
  try {
    console.log('🔍 Checking Recipe Chef database setup...\n')

    // Check if profiles table exists
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (profilesError) {
      console.error('❌ Profiles table not found. Database schema needs to be set up.')
      console.log('\n📋 To fix this:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Navigate to the SQL Editor')
      console.log('3. Copy and paste the contents of supabase-schema.sql')
      console.log('4. Run the SQL script')
      console.log('\n📄 Schema file location: supabase-schema.sql')
      return
    }

    console.log('✅ Profiles table exists')

    // Check if ouioui_lines table exists
    const { data: ouiouiData, error: ouiouiError } = await supabase
      .from('ouioui_lines')
      .select('count')
      .limit(1)

    if (ouiouiError) {
      console.error('❌ OuiOui lines table not found.')
      console.log('The Chef Tony greeting system needs the database schema.')
      return
    }

    console.log('✅ OuiOui lines table exists')

    // Check if RPC function exists
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_random_ouioui_line', { line_type: 'greeting', locale: 'en' })

    if (rpcError) {
      console.error('❌ get_random_ouioui_line RPC function not found.')
      console.log('The database schema needs to be run to create this function.')
      return
    }

    console.log('✅ get_random_ouioui_line RPC function exists')

    // Check if we have OuiOui lines
    const { data: linesData, error: linesError } = await supabase
      .from('ouioui_lines')
      .select('*')
      .limit(5)

    if (linesError) {
      console.error('❌ Error fetching OuiOui lines:', linesError)
      return
    }

    console.log(`✅ Found ${linesData.length} OuiOui lines in database`)
    
    if (linesData.length > 0) {
      console.log('\n📝 Sample OuiOui lines:')
      linesData.forEach(line => {
        console.log(`   ${line.type}: "${line.text}"`)
      })
    }

    console.log('\n🎉 Database is properly set up!')
    console.log('Chef Tony should now show alternating greeting messages.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDatabase()
