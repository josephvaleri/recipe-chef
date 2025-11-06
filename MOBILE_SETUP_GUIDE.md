# RecipeChef Mobile App Setup Guide

## ✅ What's Already Done

1. **Mobile Build**: ✅ Complete
   - Static export created in `/out` directory
   - All web assets properly configured for mobile

2. **Capacitor Configuration**: ✅ Complete
   - `capacitor.config.ts` configured with app ID `com.recipechef.app`
   - Both iOS and Android platforms added
   - Web assets synced to both platforms

3. **Project Structure**: ✅ Complete
   - `/android/` - Android project ready
   - `/ios/` - iOS project ready
   - All Capacitor plugins installed and configured

## 🛠️ Prerequisites to Install

### For Android Development:

1. **Install Java Development Kit (JDK)**
   ```bash
   # Install via Homebrew (recommended)
   brew install openjdk@17
   
   # Or download from Oracle
   # https://www.oracle.com/java/technologies/downloads/
   ```

2. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK, Android SDK Platform-Tools
   - Set up Android Virtual Device (AVD) for testing

3. **Set Environment Variables**
   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### For iOS Development:

1. **Install Xcode**
   - Download from Mac App Store
   - Install Xcode Command Line Tools: `xcode-select --install`

2. **Install CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

## 🚀 Building the Apps

### Android Build Process:

1. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

2. **Build APK**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. **Build Release APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

### iOS Build Process:

1. **Install Dependencies**
   ```bash
   cd ios
   pod install
   ```

2. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

3. **Build in Xcode**
   - Select device/simulator
   - Click Build button (⌘+B)
   - Or Archive for App Store distribution

## 📱 Testing the Apps

### Android Testing:
- Use Android Studio's built-in emulator
- Or connect physical Android device via USB
- Enable Developer Options and USB Debugging

### iOS Testing:
- Use Xcode Simulator (iOS Simulator)
- Or connect physical iOS device (requires Apple Developer account for device testing)

## 🔧 Development Workflow

### Making Changes:
1. **Update Web App**
   ```bash
   npm run build:mobile
   ```

2. **Sync to Mobile**
   ```bash
   npx cap sync
   ```

3. **Open and Test**
   ```bash
   npx cap open android
   npx cap open ios
   ```

### Live Reload for Development:
1. **Start Dev Server**
   ```bash
   npm run dev
   ```

2. **Update Capacitor Config** (uncomment in `capacitor.config.ts`):
   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:3000',
     cleartext: true
   }
   ```

3. **Sync and Run**
   ```bash
   npx cap sync
   npx cap run android
   npx cap run ios
   ```

## 📦 App Store Distribution

### Android (Google Play Store):
1. Generate signed APK/AAB in Android Studio
2. Create Google Play Console account
3. Upload and configure app listing

### iOS (App Store):
1. Archive app in Xcode
2. Upload to App Store Connect
3. Configure app listing and metadata

## 🎨 App Icons and Splash Screens

The app already has:
- ✅ App icons configured for both platforms
- ✅ Splash screens set up
- ✅ PWA manifest for web app

Icons are located in:
- Android: `android/app/src/main/res/mipmap-*/`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## 🔍 Current Status

- ✅ **Web App**: Fully functional and deployed
- ✅ **Mobile Build**: Complete and ready
- ✅ **Capacitor Setup**: Complete
- ⏳ **Android Build**: Ready (needs Java/Android Studio)
- ⏳ **iOS Build**: Ready (needs Xcode/CocoaPods)

## 📞 Next Steps

1. Install Java and Android Studio for Android development
2. Install Xcode and CocoaPods for iOS development
3. Run `npx cap open android` and `npx cap open ios`
4. Build and test your mobile apps!

Your RecipeChef mobile apps are ready to go - you just need the development tools installed! 🚀
