const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorageBucket() {
  console.log('🔧 Setting up storage bucket...')
  
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return
    }
    
    const existingBucket = buckets.find(bucket => bucket.name === 'recipes-images')
    
    if (existingBucket) {
      console.log('✅ recipes-images bucket already exists')
      console.log('📊 Bucket details:', {
        name: existingBucket.name,
        id: existingBucket.id,
        public: existingBucket.public,
        created_at: existingBucket.created_at
      })
    } else {
      console.log('📦 Creating recipes-images bucket...')
      
      // Create the bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket('recipes-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB limit
      })
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError)
        return
      }
      
      console.log('✅ recipes-images bucket created successfully')
      console.log('📊 Bucket details:', bucket)
    }
    
    // Test bucket access
    console.log('🧪 Testing bucket access...')
    const { data: testFiles, error: testError } = await supabase.storage
      .from('recipes-images')
      .list('', { limit: 1 })
    
    if (testError) {
      console.error('❌ Error accessing bucket:', testError)
    } else {
      console.log('✅ Bucket access test successful')
      console.log('📁 Files in bucket:', testFiles?.length || 0)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

setupStorageBucket()



