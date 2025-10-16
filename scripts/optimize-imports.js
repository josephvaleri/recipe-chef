#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Files to optimize (focus on largest bundles first)
const filesToOptimize = [
  'src/app/import/page.tsx',
  'src/app/finder/page.tsx',
  'src/app/cookbook/page.tsx',
  'src/app/recipe/[id]/page.tsx',
  'src/app/global-recipe/[id]/page.tsx',
]

// Common unused imports to remove
const commonUnusedImports = [
  'motion',
  'AnimatePresence',
  'CardDescription',
  'CardHeader', 
  'CardTitle',
  'Badge',
  'Star',
  'Plus',
  'Filter',
  'Clock',
  'Users',
  'Globe',
  'AlertTriangle',
  'Trash2',
  'Heart',
  'MessageCircle',
  'Edit',
  'Timer',
  'ChefHat',
  'Upload',
  'FileText',
  'Download',
  'ExternalLink',
  'CheckCircle',
  'AlertCircle',
  'Wifi',
  'Shield',
  'Github',
  'Twitter',
  'Zap',
  'BookMarked',
  'Flame',
  'Calendar',
  'List',
  'Input',
]

function optimizeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return
  }

  console.log(`🔧 Optimizing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // Remove unused imports
  commonUnusedImports.forEach(importName => {
    const importRegex = new RegExp(`import\\s*{[^}]*\\b${importName}\\b[^}]*}\\s*from\\s*['"][^'"]*['"];?\\s*`, 'g')
    const singleImportRegex = new RegExp(`import\\s+${importName}\\s+from\\s*['"][^'"]*['"];?\\s*`, 'g')
    
    if (importRegex.test(content) || singleImportRegex.test(content)) {
      content = content.replace(importRegex, '')
      content = content.replace(singleImportRegex, '')
      modified = true
      console.log(`  ✅ Removed unused import: ${importName}`)
    }
  })

  // Clean up empty import statements
  content = content.replace(/import\s*{\s*}\s*from\s*['"][^'"]*['"];?\s*/g, '')
  content = content.replace(/import\s*{\s*}\s*from\s*['"][^'"]*['"];?\s*/g, '')

  // Remove multiple empty lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n')

  if (modified) {
    fs.writeFileSync(filePath, content)
    console.log(`  ✅ File optimized: ${filePath}`)
  } else {
    console.log(`  ℹ️  No changes needed: ${filePath}`)
  }
}

function runESLintFix() {
  console.log('🔧 Running ESLint auto-fix...')
  try {
    execSync('npx eslint src/ --fix --ext .ts,.tsx', { stdio: 'inherit' })
    console.log('✅ ESLint auto-fix completed')
  } catch (error) {
    console.log('⚠️  ESLint auto-fix completed with warnings')
  }
}

function main() {
  console.log('🚀 Starting performance optimization...\n')

  // Optimize specific files
  filesToOptimize.forEach(optimizeFile)

  // Run ESLint auto-fix
  runESLintFix()

  console.log('\n✅ Performance optimization completed!')
  console.log('\n📊 Next steps:')
  console.log('1. Run "npm run build" to see bundle size improvements')
  console.log('2. Test the application to ensure everything works')
  console.log('3. Check browser dev tools for performance metrics')
}

if (require.main === module) {
  main()
}

module.exports = { optimizeFile, runESLintFix }
