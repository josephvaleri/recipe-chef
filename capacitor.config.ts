import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recipechef.app',
  appName: 'RecipeChef',
  webDir: 'out',
  
  // Server config for development (live reload)
  // Uncomment and set your local IP for dev testing on physical devices:
  // server: {
  //   url: 'http://192.168.1.50:3000',
  //   cleartext: true
  // },
  
  ios: {
    contentInset: 'never'
  },
  
  android: {
    allowMixedContent: true
  }
};

export default config;

