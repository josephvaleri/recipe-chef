/** @type {import('next').NextConfig} */
// MOBILE BUILD CONFIGURATION
// Used for: npm run build:mobile
// Creates static export in 'out/' directory for Capacitor

const nextConfig = {
  // Static export for mobile
  output: 'export',
  
  // Output directory for static files
  distDir: '.next',
  
  // Remove X-Powered-By header for security
  poweredByHeader: false,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Trailing slash for better mobile compatibility
  trailingSlash: true,
  
  // Disable server-only features for static export
  // Note: API routes won't work in mobile build - use direct Supabase client
  
  // Skip middleware for static export
  skipMiddlewareUrlNormalize: true,
}

module.exports = nextConfig

