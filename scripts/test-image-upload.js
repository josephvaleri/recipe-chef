const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testImageUpload() {
  console.log('🧪 Testing image upload...')
  
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
    
    const testUserId = '4b9ba105-1d9e-4f3a-b603-760b3f4ffe64' // From the logs
    const testFilename = 'test-image.png'
    const testPath = `${testUserId}/${testFilename}`
    
    console.log(`📤 Uploading test image to: ${testPath}`)
    
    const { data, error } = await supabase.storage
      .from('recipes-images')
      .upload(testPath, testImageData, {
        contentType: 'image/png',
        upsert: true
      })
    
    if (error) {
      console.error('❌ Upload failed:', error)
      return
    }
    
    console.log('✅ Upload successful:', data)
    
    // Generate public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipes-images')
      .getPublicUrl(data.path)
    
    console.log(`🔗 Public URL: ${publicUrl}`)
    
    // Test if URL is accessible
    try {
      const response = await fetch(publicUrl, { method: 'HEAD' })
      console.log(`✅ URL accessible (status: ${response.status})`)
    } catch (error) {
      console.log(`❌ URL not accessible: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testImageUpload()
