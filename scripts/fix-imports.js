#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Common imports that were removed but are needed
const commonImports = {
  'src/app/cookbook/page.tsx': {
    lucide: ['ChefHat', 'Wifi', 'WifiOff'],
    ui: ['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle']
  },
  'src/app/finder/page.tsx': {
    lucide: ['Filter', 'Plus', 'Clock', 'Users', 'Star'],
    ui: ['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle']
  },
  'src/app/global-recipe/[id]/page.tsx': {
    lucide: ['ChefHat', 'Trash2', 'Heart', 'MessageCircle', 'Globe', 'CheckCircle'],
    ui: ['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle']
  }
}

function fixImports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return
  }

  const imports = commonImports[filePath]
  if (!imports) return

  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // Add missing lucide imports
  if (imports.lucide && imports.lucide.length > 0) {
    const existingLucideMatch = content.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]lucide-react['"]/)
    if (existingLucideMatch) {
      const existingImports = existingLucideMatch[1].split(',').map(i => i.trim()).filter(Boolean)
      const newImports = [...new Set([...existingImports, ...imports.lucide])]
      const newImportLine = `import { ${newImports.join(', ')} } from 'lucide-react'`
      content = content.replace(existingLucideMatch[0], newImportLine)
      modified = true
    } else {
      // Add new lucide import
      const newImportLine = `import { ${imports.lucide.join(', ')} } from 'lucide-react'\n`
      content = newImportLine + content
      modified = true
    }
  }

  // Add missing UI imports
  if (imports.ui && imports.ui.length > 0) {
    const existingUIMatch = content.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]@\/components\/ui\/card['"]/)
    if (existingUIMatch) {
      const existingImports = existingUIMatch[1].split(',').map(i => i.trim()).filter(Boolean)
      const newImports = [...new Set([...existingImports, ...imports.ui])]
      const newImportLine = `import { ${newImports.join(', ')} } from '@/components/ui/card'`
      content = content.replace(existingUIMatch[0], newImportLine)
      modified = true
    } else {
      // Add new UI import
      const newImportLine = `import { ${imports.ui.join(', ')} } from '@/components/ui/card'\n`
      content = newImportLine + content
      modified = true
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content)
    console.log(`✅ Fixed imports: ${filePath}`)
  }
}

function main() {
  console.log('🔧 Fixing missing imports...\n')

  Object.keys(commonImports).forEach(fixImports)

  console.log('\n✅ Import fixes completed!')
}

if (require.main === module) {
  main()
}

module.exports = { fixImports }
