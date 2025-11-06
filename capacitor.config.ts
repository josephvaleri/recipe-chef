import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recipechef.app',
  appName: 'RecipeChef',
  webDir: 'out',
  
  // Load the app from your local development server
  server: {
    url: 'http://192.168.1.68:3000',
    cleartext: true,
    allowNavigation: [
      'https://*.supabase.co',
      'https://*.supabase.com'
    ]
  },
  
  ios: {
    contentInset: 'never'
  },
  
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    captureInput: true,
    useLegacyBridge: false
  }
};

export default config;

