const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixGlobalIngredientsSchema() {
  try {
    console.log('🔧 Fixing global_recipe_ingredients table schema...\n')

    // First, let's check the current table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('global_recipe_ingredients')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('❌ Error checking table:', tableError)
      return
    }

    console.log('✅ Table exists and is accessible')

    // Try to insert a test record with NULL ingredient_id to see if it works
    const testRecord = {
      recipe_id: 1, // This will fail due to foreign key, but we can see the error
      ingredient_id: null,
      raw_name: 'Test ingredient',
      amount: null,
      unit: null
    }

    const { data: testInsert, error: testError } = await supabase
      .from('global_recipe_ingredients')
      .insert(testRecord)

    if (testError) {
      console.log('❌ Test insert failed (expected):', testError.message)
      
      if (testError.message.includes('violates not-null constraint')) {
        console.log('🔍 Issue confirmed: ingredient_id has NOT NULL constraint')
        console.log('📋 Manual fix required:')
        console.log('1. Go to your Supabase dashboard')
        console.log('2. Navigate to the SQL Editor')
        console.log('3. Run this SQL:')
        console.log('   ALTER TABLE public.global_recipe_ingredients ALTER COLUMN ingredient_id DROP NOT NULL;')
        console.log('4. Then try the bulk upload again')
      }
    } else {
      console.log('✅ Test insert succeeded - schema is already correct')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixGlobalIngredientsSchema()

