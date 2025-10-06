const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addRawNameColumn() {
  try {
    console.log('🔧 Adding raw_name column to global_recipe_ingredients table...\n')

    // Add the raw_name column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.global_recipe_ingredients 
        ADD COLUMN IF NOT EXISTS raw_name text;
        
        COMMENT ON COLUMN public.global_recipe_ingredients.raw_name IS 'Original ingredient text as uploaded (e.g., "2 cups all-purpose flour, sifted")';
      `
    })

    if (alterError) {
      console.error('❌ Error adding raw_name column:', alterError)
      return
    }

    console.log('✅ Successfully added raw_name column to global_recipe_ingredients table')

    // Check if there are any existing records to migrate
    const { data: existingIngredients, error: checkError } = await supabase
      .from('global_recipe_ingredients')
      .select('id, amount, unit, ingredient_id, raw_name')
      .limit(5)

    if (checkError) {
      console.error('❌ Error checking existing ingredients:', checkError)
      return
    }

    console.log(`📊 Found ${existingIngredients?.length || 0} existing ingredient records`)
    
    if (existingIngredients && existingIngredients.length > 0) {
      console.log('📝 Sample existing ingredients:')
      existingIngredients.forEach(ing => {
        console.log(`   ID: ${ing.id}, Amount: ${ing.amount}, Unit: ${ing.unit}, Raw Name: ${ing.raw_name || 'NULL'}`)
      })
    }

    console.log('\n🎉 Database schema updated successfully!')
    console.log('Global recipes can now store raw ingredient text like user recipes.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addRawNameColumn()
