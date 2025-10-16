#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Development-specific optimizations
function optimizeForDevelopment() {
  console.log('🚀 Optimizing for development performance...\n')

  // 1. Update Next.js config for better dev performance
  const nextConfigPath = 'next.config.js'
  if (fs.existsSync(nextConfigPath)) {
    let config = fs.readFileSync(nextConfigPath, 'utf8')
    
    // Add development-specific optimizations
    if (!config.includes('// Development optimizations')) {
      const devOptimizations = `
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Faster builds in development
    experimental: {
      ...nextConfig.experimental,
      // Enable faster refresh
      optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    },
    // Reduce bundle analysis in dev
    webpack: (config, { dev }) => {
      if (dev) {
        // Faster source maps in development
        config.devtool = 'eval-cheap-module-source-map'
        // Reduce bundle size analysis
        config.optimization.removeAvailableModules = false
        config.optimization.removeEmptyChunks = false
        config.optimization.splitChunks = false
      }
      return config
    }
  }),`
      
      config = config.replace(
        'module.exports = withPWA(nextConfig)',
        `module.exports = withPWA({
  ...nextConfig,${devOptimizations}
})`
      )
      
      fs.writeFileSync(nextConfigPath, config)
      console.log('✅ Updated Next.js config for development')
    }
  }

  // 2. Create a development-specific package.json script
  const packageJsonPath = 'package.json'
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    if (!packageJson.scripts['dev:fast']) {
      packageJson.scripts['dev:fast'] = 'next dev --turbopack --port 3004'
      packageJson.scripts['dev:analyze'] = 'ANALYZE=true next dev --turbopack'
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
      console.log('✅ Added development scripts')
    }
  }

  // 3. Create a development environment file
  const envDevPath = '.env.development'
  if (!fs.existsSync(envDevPath)) {
    const envContent = `# Development Environment Variables
# These override .env.local for development

# Enable faster builds
NEXT_TELEMETRY_DISABLED=1

# Development-specific settings
NODE_ENV=development

# Disable some features for faster dev
NEXT_PUBLIC_ANALYTICS=false
`
    fs.writeFileSync(envDevPath, envContent)
    console.log('✅ Created development environment file')
  }

  console.log('\n🎯 Development optimization complete!')
  console.log('\n📋 Next steps:')
  console.log('1. Run: npm run dev:fast (for optimized development)')
  console.log('2. Use: npm run dev:analyze (to analyze bundle in dev)')
  console.log('3. Check browser dev tools for performance metrics')
}

if (require.main === module) {
  optimizeForDevelopment()
}

module.exports = { optimizeForDevelopment }
