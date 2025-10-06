const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserDirectory() {
  console.log('📁 Checking user directories in recipe-images bucket...')
  
  try {
    // List all files and directories in the root
    const { data: rootFiles, error: rootError } = await supabase.storage
      .from('recipe-images')
      .list('', { limit: 100 })
    
    if (rootError) {
      console.error('❌ Error listing root files:', rootError)
      return
    }
    
    console.log(`📊 Found ${rootFiles.length} items in root:`)
    rootFiles.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name} (${item.metadata?.size || 'directory'})`)
    })
    
    // Check for user directories
    const userDirs = rootFiles.filter(item => !item.name.includes('.'))
    console.log(`\n📁 Found ${userDirs.length} potential user directories:`)
    
    for (const userDir of userDirs) {
      console.log(`\n🔍 Checking directory: ${userDir.name}`)
      
      const { data: userFiles, error: userError } = await supabase.storage
        .from('recipe-images')
        .list(userDir.name, { limit: 10 })
      
      if (userError) {
        console.log(`   ❌ Error: ${userError.message}`)
      } else {
        console.log(`   📄 Found ${userFiles.length} files:`)
        userFiles.forEach((file, index) => {
          console.log(`     ${index + 1}. ${file.name}`)
          
          // Generate public URL for this file
          const { data: { publicUrl } } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(`${userDir.name}/${file.name}`)
          
          console.log(`        🔗 URL: ${publicUrl}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkUserDirectory()

