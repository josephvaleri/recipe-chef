import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recipechef.app',
  appName: 'RecipeChef',
  webDir: 'out',
  
  // Production build - no dev server
  // For development, uncomment server config:
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:3000',
  //   cleartext: true,
  //   allowNavigation: [
  //     'https://*.supabase.co',
  //     'https://*.supabase.com'
  //   ]
  // },
  
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

