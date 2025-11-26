# Google OAuth Setup Guide - Step by Step

This guide will help you complete the Google OAuth setup for Recipe Chef.

## ✅ Quick Checklist

- [ ] **Step 3**: Set up Google Cloud Console (create OAuth credentials)
- [ ] **Step 4**: Configure Supabase Dashboard (enable Google provider)
- [ ] **Test**: Try signing in with Google

## 🔑 Your Supabase Configuration

- **Project Reference**: `nmyotrpkpdhgirulsucf`
- **Redirect URI**: `https://nmyotrpkpdhgirulsucf.supabase.co/auth/v1/callback`
- **Supabase URL**: `https://nmyotrpkpdhgirulsucf.supabase.co`

## Prerequisites

- A Google account
- Access to your Supabase project dashboard
- Your Supabase project URL (found in your `.env.local` file as `NEXT_PUBLIC_SUPABASE_URL`)

---

## Step 3: Set Up Google Cloud Console

### 3.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Either:
   - **Select an existing project**, OR
   - **Click "New Project"** → Enter project name (e.g., "Recipe Chef") → Click "Create"

### 3.2 Enable Google Identity API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"** (or use this direct link: https://console.cloud.google.com/apis/library)
2. Search for **"Google Identity"** or **"Google+ API"**
3. Click on **"Google Identity Services API"** (or Google+ API if that's what you find)
4. Click the **"Enable"** button
5. Wait for it to enable (usually takes a few seconds)

### 3.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (or direct link: https://console.cloud.google.com/apis/credentials/consent)
2. Select **"External"** user type (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `Recipe Chef` (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the "Scopes" page, click **"Save and Continue"** (no need to add scopes manually)
7. On the "Test users" page:
   - If your app is in "Testing" mode, add test users (your email)
   - Click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

### 3.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (or direct link: https://console.cloud.google.com/apis/credentials)
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. If prompted, select **"Web application"** as the application type
4. Fill in the form:
   - **Name**: `Recipe Chef Web Client` (or any name you prefer)
   - **Authorized JavaScript origins**: 
     - For development: `http://localhost:3000`
     - For production: `https://your-production-domain.com` (add your actual domain)
   - **Authorized redirect URIs**: 
     - **IMPORTANT**: Add this exact URL:
       ```
       https://nmyotrpkpdhgirulsucf.supabase.co/auth/v1/callback
       ```
     - ✅ **Your Supabase project reference**: `nmyotrpkpdhgirulsucf`
5. Click **"Create"**
6. **COPY THE CREDENTIALS**:
   - A popup will show your **Client ID** and **Client Secret**
   - **Copy both** - you'll need them in Step 4
   - Format: 
     ```
     Client ID: xxxxxx-xxxxx.apps.googleusercontent.com
     Client Secret: GOCSPX-xxxxx
     ```

---

## Step 4: Configure Supabase Dashboard

### 4.1 Navigate to Authentication Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your **Recipe Chef** project
3. In the left sidebar, click **"Authentication"**
4. Click **"Providers"** (or go directly to the Providers tab)

### 4.2 Enable Google Provider

1. Scroll down to find **"Google"** in the list of providers
2. Click the **toggle switch** to enable Google (it should turn green/blue)
3. A form will appear with two fields:
   - **Client ID (for OAuth)**
   - **Client Secret (for OAuth)**

### 4.3 Enter Google OAuth Credentials

1. **Paste your Client ID** from Step 3.4 into the "Client ID" field
2. **Paste your Client Secret** from Step 3.4 into the "Client Secret" field
3. **Click "Save"** (or the save button at the bottom)

### 4.4 Verify Configuration

1. The Google provider should now show as **"Enabled"**
2. You should see a green checkmark or enabled indicator
3. The form fields should be filled with your credentials

---

## Step 5: Test the Integration

### 5.1 Test in Development

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/auth/signin`
3. Click the **"Continue with Google"** button
4. You should be redirected to Google's sign-in page
5. Sign in with your Google account
6. You should be redirected back to your app and logged in

### 5.2 Troubleshooting

**If you see "Redirect URI mismatch":**
- Double-check the redirect URI in Google Cloud Console matches exactly:
  - `https://nmyotrpkpdhgirulsucf.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes or extra characters

**If you see "OAuth client not found":**
- Verify the Client ID and Client Secret are correct in Supabase
- Make sure you copied them correctly (no extra spaces)

**If the button doesn't redirect:**
- Check browser console for errors
- Verify Google Identity API is enabled in Google Cloud Console
- Make sure OAuth consent screen is configured

**If callback fails:**
- Check that your callback route is accessible: `/auth/callback`
- Verify cookies are enabled in your browser
- Check Supabase logs for authentication errors

---

## Quick Reference: Finding Your Supabase Project Reference

Your Supabase project reference is the part before `.supabase.co` in your project URL.

**To find it:**

1. **From Supabase Dashboard:**
   - Look at the URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`
   - Or look at your project settings → API → Project URL

2. **From Environment Variables:**
   - Check `.env.local` file
   - Look for `NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`

3. **Your Project:**
   - Your Supabase URL: `https://nmyotrpkpdhgirulsucf.supabase.co`
   - Your project reference: `nmyotrpkpdhgirulsucf`
   - Your redirect URI: `https://nmyotrpkpdhgirulsucf.supabase.co/auth/v1/callback` ✅

---

## Production Setup

When deploying to production, you'll need to:

1. **Add production redirect URI in Google Cloud Console:**
   - Go to your OAuth client credentials
   - Add: `https://your-production-domain.com/auth/callback`
   - Also keep the Supabase callback: `https://nmyotrpkpdhgirulsucf.supabase.co/auth/v1/callback`

2. **Update OAuth consent screen:**
   - Add your production domain to authorized domains
   - Submit for verification if you want to make it public (optional)

---

## Security Notes

- Never commit your Client Secret to version control
- Keep your `.env.local` file in `.gitignore` (should already be there)
- The Client Secret is stored securely in Supabase Dashboard
- Google OAuth is free and secure for authentication

---

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase Dashboard → Authentication → Logs
3. Verify all URLs match exactly (no typos, correct protocol http/https)
4. Make sure you're using the correct project reference

