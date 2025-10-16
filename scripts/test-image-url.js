const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testImageUrl() {
  console.log('🧪 Testing image URL accessibility...')
  
  try {
    // Test the first image URL we found
    const testUrl = 'https://nmyotrpkpdhgirulsucf.supabase.co/storage/v1/object/public/recipe-images/current-user-id/recipe-image-1759662625546.jpg'
    
    console.log(`🔗 Testing URL: ${testUrl}`)
    
    const response = await fetch(testUrl, { method: 'HEAD' })
    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      console.log('✅ Image URL is accessible!')
    } else {
      console.log('❌ Image URL is not accessible')
    }
    
    // Also test generating a public URL for the same file
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl('current-user-id/recipe-image-1759662625546.jpg')
    
    console.log(`\n🔗 Generated URL: ${publicUrl}`)
    
    const response2 = await fetch(publicUrl, { method: 'HEAD' })
    console.log(`📊 Generated URL status: ${response2.status}`)
    
  } catch (error) {
    console.error('❌ Error testing image URL:', error)
  }
}

testImageUrl()



