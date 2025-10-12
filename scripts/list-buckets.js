const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listBuckets() {
  console.log('📦 Listing all storage buckets...')
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Error listing buckets:', error)
      return
    }
    
    console.log(`📊 Found ${buckets.length} buckets:`)
    buckets.forEach((bucket, index) => {
      console.log(`  ${index + 1}. ${bucket.name}`)
      console.log(`     - ID: ${bucket.id}`)
      console.log(`     - Public: ${bucket.public}`)
      console.log(`     - Created: ${bucket.created_at}`)
    })
    
    // Check each bucket for files
    for (const bucket of buckets) {
      console.log(`\n📁 Files in ${bucket.name}:`)
      const { data: files, error: listError } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 5 })
      
      if (listError) {
        console.log(`   ❌ Error: ${listError.message}`)
      } else {
        console.log(`   📄 Found ${files.length} files`)
        files.forEach((file, index) => {
          console.log(`     ${index + 1}. ${file.name}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

listBuckets()


