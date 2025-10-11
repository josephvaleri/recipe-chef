# RecipeChef Mobile App - Build Guide

## 📱 Overview

This guide covers building RecipeChef as native iOS and Android apps using Capacitor.

---

## 🚀 Quick Start

```bash
# 1. Build mobile static export
npm run build:mobile

# 2. Sync to native projects
npm run cap:sync

# 3. Open in IDE
npm run cap:open:ios      # Opens Xcode
npm run cap:open:android  # Opens Android Studio
```

---

## ⚙️ Prerequisites

### For iOS Development:
- macOS (required)
- Xcode 14+ installed
- CocoaPods installed: `sudo gem install cocoapods`
- iOS Simulator or physical iOS device

### For Android Development:
- Android Studio installed
- Android SDK 21+ (Lollipop)
- Android Emulator or physical Android device

### For Both:
- Node.js 18+
- npm or yarn

---

## 📋 Environment Setup

### 1. Configure Environment Variables

Add to your `.env.local`:

```bash
# Mobile App Configuration
NEXT_PUBLIC_MOBILE_CALLBACK_URL=recipechef://auth/callback
MOBILE_CALLBACK_SCHEME=recipechef
```

### 2. Configure Supabase OAuth Redirect

In your Supabase Dashboard:
1. Go to **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   ```
   recipechef://auth/callback
   ```
3. Save changes

---

## 🏗️ Build Process

### How It Works

The mobile build process:
1. **Temporarily disables middleware** (server-side only, not needed for mobile)
2. **Builds static export** with `output: 'export'`
3. **Copies files** from `.next/server/app` to `out/`
4. **Restores middleware** for web builds
5. **Syncs to native projects**

### Build Commands

```bash
# Full mobile build
npm run build:mobile

# Just export (after build)
npm run export:mobile

# Sync to native platforms
npm run cap:sync

# Add platforms (first time only)
npm run cap:add:ios
npm run cap:add:android
```

---

## 📱 Platform-Specific Setup

### iOS Setup

#### 1. Deep Link Configuration ✅ DONE
File: `ios/App/App/Info.plist`

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.recipechef.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>recipechef</string>
    </array>
  </dict>
</array>
```

#### 2. Install CocoaPods Dependencies

```bash
cd ios/App
pod install
cd ../..
```

#### 3. Open in Xcode

```bash
npm run cap:open:ios
```

#### 4. Configure Signing & Capabilities
1. Select your Team in "Signing & Capabilities"
2. Update Bundle Identifier if needed
3. Select target device or simulator
4. Click Run ▶️

---

### Android Setup

#### 1. Deep Link Configuration ✅ DONE
File: `android/app/src/main/AndroidManifest.xml`

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data 
    android:scheme="recipechef" 
    android:host="auth" 
    android:path="/callback" />
</intent-filter>
```

#### 2. Open in Android Studio

```bash
npm run cap:open:android
```

#### 3. Configure & Run
1. Sync Gradle files (prompt will appear)
2. Select emulator or physical device
3. Click Run ▶️

---

## 🎨 Icons & Splash Screens

### Option 1: Automatic Generation (Recommended)

1. Place your assets in `/assets/`:
   - `icon.png` (1024x1024px)
   - `splash.png` (2732x2732px, background: #C6DBEF)

2. Generate all sizes:
   ```bash
   npm run cap:assets
   ```

### Option 2: Manual

Place platform-specific icons manually:
- **iOS:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Android:** `android/app/src/main/res/mipmap-*/`

---

## 🔐 Authentication Flow

### Web OAuth (existing)
```
User → Sign In → Supabase OAuth → Redirect to app
```

### Mobile OAuth (new)
```
User → Sign In → Opens Browser → Supabase OAuth → recipechef://auth/callback → App
```

### Mobile Auth Code Example

```typescript
import { signInWithGoogleMobile, handleOAuthCallback, isMobileApp } from '@/lib/auth-mobile';
import { App } from '@capacitor/app';

// On sign in button click
async function handleSignIn() {
  if (isMobileApp()) {
    await signInWithGoogleMobile();
  } else {
    // Existing web OAuth
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }
}

// Listen for deep link callbacks (add in _app or layout)
if (isMobileApp()) {
  App.addListener('appUrlOpen', async (data) => {
    if (data.url.startsWith('recipechef://auth/callback')) {
      await handleOAuthCallback(data.url);
      // Navigate to home or desired page
      router.push('/');
    }
  });
}
```

---

## 🔧 Development Workflow

### Live Reload on Device

1. Find your local IP:
   ```bash
   ipconfig getifaddr en0  # macOS
   ```

2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.50:3000',
     cleartext: true
   }
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

4. Rebuild and sync:
   ```bash
   npm run cap:sync
   ```

5. App now loads from your dev server (hot reload works!)

### Production Build

1. Comment out `server` in `capacitor.config.ts`
2. Build mobile app:
   ```bash
   npm run build:mobile
   npm run cap:sync
   ```
3. Open in IDE and build release

---

## 🐛 Troubleshooting

### Issue: `out` directory not found
**Solution:** Run `npm run build:mobile` (not just `next build`)

### Issue: Middleware errors in mobile build
**Solution:** The build script automatically handles this by temporarily moving middleware

### Issue: CocoaPods not installed
**Solution:** 
```bash
sudo gem install cocoapods
cd ios/App && pod install
```

### Issue: OAuth doesn't return to app
**Solution:**
1. Check `recipechef://auth/callback` is in Supabase redirect URLs
2. Verify Info.plist and AndroidManifest.xml have scheme configured
3. Check `.env.local` has `NEXT_PUBLIC_MOBILE_CALLBACK_URL`

### Issue: App crashes on launch
**Solution:**
1. Check `out` directory has `index.html`
2. Run `npm run cap:sync` again
3. Clean build in Xcode/Android Studio

---

## 📦 Distribution

### iOS App Store

1. Archive in Xcode
2. Validate app
3. Upload to App Store Connect
4. Submit for review

### Google Play Store

1. Build signed APK/AAB in Android Studio
2. Upload to Google Play Console
3. Submit for review

---

## 🔄 Update Workflow

When you make code changes:

```bash
# 1. Build new version
npm run build:mobile

# 2. Sync to native projects
npm run cap:sync

# 3. No need to reopen IDE - just rebuild there
```

---

## ⚠️ Important Notes

### Web vs Mobile Differences

| Feature | Web | Mobile |
|---------|-----|--------|
| API Routes | ✅ Server-side | ❌ Use Supabase client directly |
| Middleware | ✅ Enabled | ❌ Disabled for static export |
| Auth | Supabase OAuth | Deep link callback |
| Storage | Browser | Device storage |
| Push Notifications | Web Push | Native Push (setup required) |

### Mobile Limitations

Since the mobile app is a **static export**, these features work differently:

- ✅ **Supabase client** - Works (all database operations)
- ✅ **Authentication** - Works (OAuth with deep links)
- ✅ **File storage** - Works (Supabase Storage)
- ❌ **API routes** - Don't exist (use Supabase functions instead)
- ❌ **Middleware** - Not included (auth handled client-side)
- ❌ **Server-side rendering** - Static pages only

### Security Note

Mobile apps use **client-side authentication**. The middleware auth (server-side) is only for web deployments. Ensure:
- Row Level Security (RLS) is properly configured in Supabase
- Sensitive operations use Supabase RPC functions
- API keys are properly scoped (use anon key, not service role)

---

## 📚 Additional Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Developer Guide](https://developer.apple.com/documentation/)
- [Android Developer Guide](https://developer.android.com/docs)
- [Supabase Mobile Auth](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

---

## ✅ Checklist

Before submitting to app stores:

- [ ] Icons and splash screens generated
- [ ] OAuth deep links tested on physical devices
- [ ] App signing configured (iOS: Provisioning Profile, Android: Keystore)
- [ ] Privacy policy URL added
- [ ] App Store descriptions prepared
- [ ] Screenshots created for all required sizes
- [ ] Tested on multiple devices/OS versions
- [ ] Performance tested (loading times, memory usage)
- [ ] Offline functionality tested
- [ ] Push notifications configured (if needed)
- [ ] Analytics added (if needed)

---

## 🎉 Success Criteria

Your mobile app is ready when:

✅ iOS project opens in Xcode without errors  
✅ Android project opens in Android Studio without errors  
✅ App runs on simulator/emulator  
✅ OAuth sign-in returns to app successfully  
✅ Icons and splash screens display correctly  
✅ All core features work (recipes, calendar, shopping list)  

**You're now ready to build and distribute RecipeChef mobile apps!** 📱🎉

