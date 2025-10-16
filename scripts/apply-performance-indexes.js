#!/usr/bin/env node

/**
 * Performance Index Migration Script
 * 
 * This script applies critical database indexes to fix the performance issues
 * identified in the Recipe Chef application, particularly the cookbook page.
 * 
 * Run with: node scripts/apply-performance-indexes.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const indexes = [
  {
    name: 'idx_user_recipes_user_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_user_recipes_user_created ON public.user_recipes(user_id, created_at DESC);',
    description: 'Optimizes main cookbook query (user_id + created_at ordering)'
  },
  {
    name: 'idx_ratings_user_scope_key', 
    sql: 'CREATE INDEX IF NOT EXISTS idx_ratings_user_scope_key ON public.ratings(user_id, recipe_scope, recipe_key);',
    description: 'Optimizes rating lookup queries'
  },
  {
    name: 'idx_user_recipe_ingredients_recipe_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_user_recipe_ingredients_recipe_id ON public.user_recipe_ingredients(user_recipe_id);',
    description: 'Optimizes ingredient loading JOINs'
  },
  {
    name: 'idx_cuisines_name',
    sql: 'CREATE INDEX IF NOT EXISTS idx_cuisines_name ON public.cuisines(name);',
    description: 'Optimizes cuisine name lookups'
  },
  {
    name: 'idx_meal_types_name',
    sql: 'CREATE INDEX IF NOT EXISTS idx_meal_types_name ON public.meal_types(name);',
    description: 'Optimizes meal type name lookups'
  },
  {
    name: 'idx_ingredients_name',
    sql: 'CREATE INDEX IF NOT EXISTS idx_ingredients_name ON public.ingredients(name);',
    description: 'Optimizes ingredient name lookups'
  },
  {
    name: 'idx_ingredients_category_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON public.ingredients(category_id);',
    description: 'Optimizes category-based ingredient queries'
  }
]

async function applyIndexes() {
  console.log('🚀 Applying performance indexes to Recipe Chef database...\n')
  
  let successCount = 0
  let errorCount = 0
  
  for (const index of indexes) {
    try {
      console.log(`📊 Creating index: ${index.name}`)
      console.log(`   ${index.description}`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: index.sql })
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`)
        errorCount++
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
      console.log('')
      
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`)
      errorCount++
      console.log('')
    }
  }
  
  console.log('📈 Performance Index Migration Summary:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log(`   📊 Total: ${indexes.length}`)
  
  if (successCount === indexes.length) {
    console.log('\n🎉 All performance indexes applied successfully!')
    console.log('   The cookbook page should now load much faster.')
    console.log('   Users with 100+ recipes should see significant improvement.')
  } else if (successCount > 0) {
    console.log('\n⚠️  Some indexes were applied successfully.')
    console.log('   Performance should be improved, but some optimizations may be missing.')
  } else {
    console.log('\n❌ No indexes were applied successfully.')
    console.log('   Please check your database connection and permissions.')
  }
}

// Run the migration
applyIndexes().catch(console.error)
