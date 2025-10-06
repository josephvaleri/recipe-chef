const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addMatchedAliasColumn() {
  try {
    console.log('🔧 Adding matched_alias column to global_recipe_ingredients_detail table...\n')

    // Test if the column already exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('global_recipe_ingredients_detail')
      .select('matched_alias')
      .limit(1)

    if (!testError) {
      console.log('✅ matched_alias column already exists')
      return
    }

    console.log('📊 Column does not exist, adding it...')
    console.log('⚠️  Note: This requires manual SQL execution in Supabase dashboard')
    console.log('\n📋 Please run this SQL in your Supabase SQL Editor:')
    console.log(`
ALTER TABLE public.global_recipe_ingredients_detail 
ADD COLUMN matched_alias text;

COMMENT ON COLUMN public.global_recipe_ingredients_detail.matched_alias IS 'The alias that was matched from ingredient_aliases table when no exact match found in ingredients table';

CREATE INDEX IF NOT EXISTS idx_global_recipe_ingredients_detail_matched_alias 
  ON public.global_recipe_ingredients_detail(matched_alias);
    `)

    console.log('\n🎉 After running the SQL, the matched_alias column will be available!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addMatchedAliasColumn()
