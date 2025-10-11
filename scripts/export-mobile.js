#!/usr/bin/env node
/**
 * Mobile Export Script
 * Creates static export for Capacitor by copying built files from .next
 * This is needed because middleware prevents Next.js static export
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../.next/server/app');
const OUT_DIR = path.join(__dirname, '../out');
const STATIC_DIR = path.join(__dirname, '../.next/static');

console.log('📱 Creating mobile export...\n');

// Create out directory
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('✅ Created out directory');
}

// Copy HTML files and structure
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source directory not found: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      // Copy HTML files and other assets
      if (entry.name.endsWith('.html') || entry.name.endsWith('.css') || entry.name.endsWith('.js')) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

console.log('📄 Copying static pages...');
copyDirectory(SOURCE_DIR, OUT_DIR);

// Copy static assets (_next folder)
console.log('📦 Copying static assets...');
const outStaticDir = path.join(OUT_DIR, '_next');
if (fs.existsSync(STATIC_DIR)) {
  copyDirectory(STATIC_DIR, outStaticDir);
  console.log('✅ Static assets copied');
}

// Copy public folder
const publicDir = path.join(__dirname, '../public');
const publicFiles = fs.readdirSync(publicDir);
for (const file of publicFiles) {
  const srcFile = path.join(publicDir, file);
  const destFile = path.join(OUT_DIR, file);
  
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
  }
}
console.log('✅ Public assets copied');

console.log('\n✅ Mobile export complete!');
console.log(`📂 Output directory: ${OUT_DIR}`);
console.log('\n📱 Next steps:');
console.log('  1. npx cap sync');
console.log('  2. npx cap open ios');
console.log('  3. npx cap open android\n');

