const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllUserDirs() {
  console.log('📁 Checking all user directories in recipe-images bucket...')
  
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
    
    // Check each directory
    for (const item of rootFiles) {
      if (!item.name.includes('.')) { // Likely a directory
        console.log(`\n🔍 Checking directory: ${item.name}`)
        
        const { data: dirFiles, error: dirError } = await supabase.storage
          .from('recipe-images')
          .list(item.name, { limit: 5 })
        
        if (dirError) {
          console.log(`   ❌ Error: ${dirError.message}`)
        } else {
          console.log(`   📄 Found ${dirFiles.length} files`)
          if (dirFiles.length > 0) {
            console.log(`   📝 First few files:`)
            dirFiles.slice(0, 3).forEach((file, index) => {
              console.log(`     ${index + 1}. ${file.name}`)
            })
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAllUserDirs()









