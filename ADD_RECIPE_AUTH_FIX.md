# Add Recipe Page - Auth Issue Fix

## Problem
URL uploader on `/add` page was returning 401 Unauthorized error:
```
POST http://localhost:3000/api/import-recipe 401 (Unauthorized)
```

## Root Causes

### 1. Missing Credentials in Fetch Request
The client-side fetch call wasn't explicitly including credentials (cookies), which are needed for server-side session validation in Next.js 15.

### 2. Unclear Error Messages
When auth failed, the API only returned "Authentication required" without details about WHY it failed.

## Fixes Applied

### Fix 1: Added `credentials: 'include'` to Fetch Call
**File:** `src/app/add/page.tsx` (line 56)

**Before:**
```typescript
const response = await fetch('/api/import-recipe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url }),
})
```

**After:**
```typescript
const response = await fetch('/api/import-recipe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Ensure cookies are sent
  body: JSON.stringify({ url }),
})
```

**Why:** In Next.js 15 App Router, cookies need to be explicitly included in same-origin requests for server components to access them.

### Fix 2: Enhanced Error Logging
**File:** `src/app/api/import-recipe/route.ts` (lines 18-28)

**Added:**
- Detailed console logging of auth errors
- Request headers logging for debugging
- More descriptive error messages returned to client

**Now logs:**
```javascript
console.error('Auth error in import-recipe:', authError)
console.error('User:', user)
console.error('Request headers:', Object.fromEntries(request.headers.entries()))
```

**Returns better error:**
```json
{
  "error": "Authentication required. Please sign in again.",
  "details": "Specific error message or 'No user found'"
}
```

## Testing Steps

1. **Sign out and sign back in** to get a fresh session
2. Go to `/add` page
3. Enter a recipe URL (e.g., from AllRecipes, Food Network, NYTimes Cooking)
4. Click "Import from Web"
5. Should now work without 401 error

## If Still Getting 401

Check the **browser console** and **server logs** for:

### Browser Console:
- Look for the fetch request in Network tab
- Check if cookies are being sent (Headers → Request Headers)
- Check response error message

### Server Logs:
- Look for "Auth error in import-recipe:" 
- Check what the actual error message is
- Verify environment variables are set correctly

### Common Causes:
1. **Session expired** - Sign out and sign back in
2. **Environment variables missing** - Check `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. **Cookie settings in Supabase dashboard** - Ensure cookies are enabled for your domain
4. **Development server restart needed** - Restart `npm run dev`

## Recipe Parsing Order (Already Correct!)

The recipe URL parser already follows the recommended order:

### Current Implementation (`src/lib/jsonld.ts` lines 38-68):

1. ✅ **JSON-LD** (schema.org/Recipe) - Highest priority, HIGH confidence
2. ✅ **Microdata** (itemtype="Recipe") - HIGH confidence
3. ✅ **RDFa** (property/vocab attributes) - MEDIUM confidence
4. ✅ **h-recipe** (Microformats) - MEDIUM confidence
5. ✅ **Heuristic HTML** (text parsing) - Lowest priority, LOW confidence

This matches the recommended order from:
- [Google for Developers - Recipe Structured Data](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- [Schema.org - Recipe](https://schema.org/Recipe)
- [Microformats - h-recipe](http://microformats.org/wiki/h-recipe)

### Confidence Levels:
- **HIGH**: Structured data with schema validation (JSON-LD, Microdata)
- **MEDIUM**: Semantic markup but less structured (RDFa, h-recipe)
- **LOW**: Best-effort text parsing (Heuristic)

## Files Modified
- `src/app/add/page.tsx` - Added credentials: 'include'
- `src/app/api/import-recipe/route.ts` - Enhanced error logging

## No Changes Needed
- `src/lib/jsonld.ts` - Parsing order is already correct!









