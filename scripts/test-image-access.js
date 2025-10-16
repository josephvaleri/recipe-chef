const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testImageAccess() {
  console.log('🧪 Testing image access...')
  
  try {
    // List all files in the recipes-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from('recipes-images')
      .list('', { limit: 10 })
    
    if (listError) {
      console.error('❌ Error listing files:', listError)
      return
    }
    
    console.log(`📁 Found ${files.length} files in recipes-images bucket:`)
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`)
    })
    
    if (files.length > 0) {
      // Test generating a public URL for the first file
      const testFile = files[0]
      const { data: { publicUrl } } = supabase.storage
        .from('recipes-images')
        .getPublicUrl(testFile.name)
      
      console.log(`\n🔗 Public URL for ${testFile.name}:`)
      console.log(`   ${publicUrl}`)
      
      // Test if the URL is accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' })
        console.log(`   ✅ URL accessible (status: ${response.status})`)
      } catch (error) {
        console.log(`   ❌ URL not accessible: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testImageAccess()



