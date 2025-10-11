# Mobile App Assets

## Required Assets for Capacitor

Place the following assets in this directory:

### 1. App Icon
- **File:** `icon.png`
- **Size:** 1024x1024 pixels
- **Format:** PNG with transparency
- **Purpose:** App icon for both iOS and Android

### 2. Splash Screen
- **File:** `splash.png`
- **Size:** 2732x2732 pixels
- **Format:** PNG
- **Background:** Should match app theme (#C6DBEF recommended)
- **Purpose:** Launch screen for both platforms

## Generating Platform-Specific Assets

After adding `icon.png` and `splash.png` to this directory, run:

```bash
npm run cap:assets
```

This will automatically generate all required sizes for:
- iOS (App Icon, Launch Images)
- Android (Mipmap icons, Splash screens)

## Manual Generation

If you have the assets, you can generate platform-specific versions:

```bash
npx capacitor-assets generate --platform ios --platform android
```

## Asset Requirements

### iOS:
- App Icons: 1024x1024, 180x180, 120x120, 87x87, 80x80, 76x76, 60x60, 58x58, 40x40, 29x29, 20x20
- Launch Images: Various sizes for different devices

### Android:
- Mipmaps: xxxhdpi (192x192), xxhdpi (144x144), xhdpi (96x96), hdpi (72x72), mdpi (48x48)
- Splash: ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi

## Placeholder Assets

If you don't have assets yet, you can create simple placeholders:

### Icon Placeholder (SVG to PNG)
Use a tool like GIMP, Photoshop, or online converter to create a 1024x1024 PNG with:
- Chef hat icon
- Orange background (#F97316)
- White icon
- RecipeChef text

### Splash Placeholder
- 2732x2732 PNG
- Background: #C6DBEF (your app's blue)
- Center: RecipeChef logo/text
- Chef Tony character (optional)

