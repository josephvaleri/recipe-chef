# RecipeChef GPT Authentication Guide

## 🔐 How RecipeChef Users Authenticate with the GPT

### Overview
RecipeChef users can authenticate with the RecipeChef Importer GPT to save recipes directly to their RecipeChef account. This guide explains the complete authentication flow.

## 🚀 Authentication Flow

### Step 1: User Gets Authentication Details
1. **Sign in to RecipeChef** - User must be logged into their RecipeChef account
2. **Navigate to Profile/Settings** - Go to their profile page or settings
3. **Find GPT Authentication Section** - Look for "GPT Authentication" or "RecipeChef Importer" section
4. **Copy Authentication Details** - Click to copy User ID and Auth Token

### Step 2: User Provides Details to GPT
1. **Go to ChatGPT** - Navigate to ChatGPT and find the "RecipeChef Importer" GPT
2. **Request Recipe Import** - Ask the GPT to import a recipe
3. **Provide Authentication** - When prompted, paste the authentication details
4. **Confirm Save** - The GPT will save the recipe directly to their RecipeChef account

## 🛠️ Implementation Details

### Authentication Components Created

#### 1. **GPTAuthHelper Component** (`src/components/GPTAuthHelper.tsx`)
- React component for users to get their authentication details
- Provides buttons to copy auth details to clipboard
- Shows authentication status and expiration
- Includes step-by-step instructions

#### 2. **Authentication Helper Library** (`src/lib/gpt-auth-helper.ts`)
- `getGPTAuthDetails()` - Gets current user's auth details
- `copyGPTAuthToClipboard()` - Copies auth details to clipboard
- `generateGPTShareLink()` - Creates shareable auth link
- `validateGPTAuth()` - Validates auth details

#### 3. **Authenticated API Endpoint** (`src/app/api/public/import-recipe-with-auth/route.ts`)
- Handles recipe import with optional authentication
- Saves recipes to user's account when authenticated
- Returns different responses based on auth status

## 📱 User Experience

### For RecipeChef Users (Authenticated)

```
User: "Import this recipe: https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/"

GPT: I'll import that recipe for you! Would you like to save it directly to your RecipeChef account?

User: "Yes, please save it to my account. Here are my authentication details:
User ID: 123e4567-e89b-12d3-a456-426614174000
Auth Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

GPT: ✅ Successfully imported and saved "Cheesy Chicken Broccoli Casserole" to your RecipeChef account!
📝 Recipe: Cheesy Chicken Broccoli Casserole
🥕 8 ingredients found
📋 6 cooking steps
⏱️ Prep: 15 minutes, Cook: 30 minutes
👥 Serves: 6 people
🎯 Parsed with high confidence using JSON-LD
💾 Saved to your RecipeChef account with ID: recipe_123

The recipe is now available in your RecipeChef cookbook!
```

### For Non-RecipeChef Users (Unauthenticated)

```
User: "Import this recipe: https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/"

GPT: I'll import that recipe for you!

✅ Successfully imported "Cheesy Chicken Broccoli Casserole"!
📝 Recipe: Cheesy Chicken Broccoli Casserole
🥕 8 ingredients found
📋 6 cooking steps
⏱️ Prep: 15 minutes, Cook: 30 minutes
👥 Serves: 6 people
🎯 Parsed with high confidence using JSON-LD

To save this recipe to your RecipeChef account:
1. Sign up for RecipeChef at https://recipechef.app
2. Sign in to your account
3. Go to your Profile page
4. Look for "GPT Authentication" section
5. Copy your authentication details
6. Paste them when importing recipes

The recipe is ready to use - you can copy the formatted text above!
```

## 🔧 Technical Implementation

### Authentication Details Structure
```typescript
interface GPTAuthDetails {
  user_id: string        // RecipeChef user ID
  auth_token: string     // JWT access token
  expires_at: string     // Token expiration timestamp
}
```

### API Endpoint Usage
```typescript
// With authentication (saves to account)
POST /api/public/import-recipe-with-auth
{
  "url": "https://example.com/recipe",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Without authentication (just parses)
POST /api/public/import-recipe-with-auth
{
  "url": "https://example.com/recipe"
}
```

### Response Format
```typescript
// Authenticated response
{
  "recipe": { /* parsed recipe data */ },
  "paprikaText": "# Recipe Name\n\n...",
  "confidence": "high",
  "source": "jsonld",
  "saved": true,
  "recipeId": "recipe_123",
  "message": "Recipe successfully imported and saved to your RecipeChef account!"
}

// Unauthenticated response
{
  "recipe": { /* parsed recipe data */ },
  "paprikaText": "# Recipe Name\n\n...",
  "confidence": "high",
  "source": "jsonld",
  "saved": false,
  "message": "Recipe parsed successfully! To save it to your RecipeChef account, please sign in and provide your authentication details."
}
```

## 🛡️ Security Considerations

### Token Security
- **JWT Tokens**: Use existing Supabase JWT tokens
- **Expiration**: Tokens expire automatically (typically 1 hour)
- **Scope**: Tokens only allow access to user's own data
- **Validation**: Server validates token and user ID match

### Best Practices
- **No Long-term Storage**: Don't store auth tokens in GPT
- **User Control**: Users must explicitly provide auth details
- **Clear Instructions**: Provide clear guidance on getting auth details
- **Error Handling**: Graceful fallback when authentication fails

## 📋 Setup Checklist

### For RecipeChef App
- [ ] Add GPTAuthHelper component to profile page
- [ ] Deploy authenticated API endpoint
- [ ] Test authentication flow
- [ ] Add user instructions/documentation

### For GPT Configuration
- [ ] Update GPT instructions with auth flow
- [ ] Add authenticated endpoint to OpenAPI schema
- [ ] Test with real user authentication
- [ ] Provide clear error messages

### For Users
- [ ] Sign in to RecipeChef account
- [ ] Navigate to profile page
- [ ] Find GPT authentication section
- [ ] Copy authentication details
- [ ] Use with RecipeChef Importer GPT

## 🎯 Benefits

### For Users
- **One-Click Import**: Save recipes directly to their account
- **Seamless Experience**: No manual copying/pasting
- **Account Integration**: Recipes appear in their cookbook
- **Cross-Platform**: Use ChatGPT to import to RecipeChef

### For RecipeChef
- **User Engagement**: Increased recipe collection
- **Platform Integration**: Connect with popular AI tools
- **User Retention**: Easier recipe management
- **Growth**: Attract users from ChatGPT

## 🚨 Troubleshooting

### Common Issues

#### "Invalid Authentication" Error
- **Cause**: Expired or invalid token
- **Solution**: User needs to get fresh auth details from RecipeChef

#### "No Recipe Found" Error
- **Cause**: URL doesn't contain parseable recipe
- **Solution**: Try different recipe URL or use text import

#### "Recipe Already Exists" Error
- **Cause**: User already has a recipe with that name
- **Solution**: Recipe is skipped, user can rename and try again

### User Support
- Provide clear error messages
- Include helpful hints and solutions
- Guide users through authentication process
- Offer alternative import methods

## 🔮 Future Enhancements

### Planned Features
- **QR Code Authentication**: Generate QR codes for easy auth
- **Browser Extension**: Direct import from recipe websites
- **Batch Import**: Import multiple recipes at once
- **Recipe Validation**: Check for duplicates before import

### Advanced Features
- **Smart Deduplication**: Automatically detect similar recipes
- **Recipe Enhancement**: AI-powered recipe improvements
- **Nutritional Analysis**: Add nutrition information
- **Cooking Time Optimization**: Suggest time improvements

## 📞 Support

### For Users
- Clear error messages with solutions
- Step-by-step authentication guide
- Alternative import methods
- Direct support contact

### For Developers
- Comprehensive API documentation
- Error code reference
- Authentication flow diagrams
- Testing guidelines

---

**Ready to implement!** This authentication system provides a secure, user-friendly way for RecipeChef users to import recipes directly from ChatGPT into their RecipeChef account. 🚀
