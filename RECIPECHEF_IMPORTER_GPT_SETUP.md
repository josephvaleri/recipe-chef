# RecipeChef Importer GPT Setup Guide

## Overview
This guide will help you create a custom GPT called "RecipeChef Importer" that allows users to import recipes directly into your RecipeChef app from ChatGPT. The GPT can handle both URL scraping and text-based recipe imports.

## Features
- **URL Import**: Scrape recipes from any recipe website using JSON-LD parsing
- **Text Import**: Import recipes from Paprika or Meal-Master format text
- **One-Click Import**: Seamless integration with RecipeChef app
- **Smart Parsing**: Automatic format detection and high-confidence parsing
- **Error Handling**: Graceful fallbacks and helpful error messages

## Setup Instructions

### Step 1: Create the Custom GPT

1. Go to [ChatGPT](https://chat.openai.com/) and sign in
2. Click on "Explore" in the left sidebar
3. Click "Create a GPT"
4. Choose "Configure" tab
5. Fill in the following details:

#### Basic Information
- **Name**: `RecipeChef Importer`
- **Description**: `Import recipes from URLs or Paprika/Meal-Master text directly into RecipeChef app. Perfect for one-click recipe importing from any source.`
- **Instructions**: Copy the content from `recipechef-importer-gpt.json` instructions field

#### Capabilities
- ✅ Web Browsing
- ❌ Code Interpreter
- ❌ File Upload

### Step 2: Add Actions

1. In the GPT configuration, scroll down to "Actions"
2. Click "Create new action"
3. Choose "Import from OpenAPI spec"
4. Upload the `recipechef-importer-openapi.yaml` file
5. The system will automatically create the actions based on your API schema

### Step 3: Configure Authentication (Optional)

Since your API endpoints require authentication, you have a few options:

#### Option A: Public Endpoints (Recommended for GPT)
Create public versions of your import endpoints that don't require authentication for GPT usage:

```typescript
// Create new public endpoints
// /api/public/import-recipe
// /api/public/import-paprika
```

#### Option B: API Key Authentication
Add API key authentication to your existing endpoints and configure the GPT to use it.

#### Option C: No Authentication (Development Only)
For testing purposes, you can temporarily disable authentication on your import endpoints.

### Step 4: Test the GPT

1. Save your GPT configuration
2. Test with sample URLs:
   - `https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/`
   - `https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524`
3. Test with sample Paprika text:
   ```
   # Test Recipe
   
   A simple test recipe for GPT import
   
   ## Ingredients
   - 2 cups flour
   - 1 cup sugar
   - 1/2 cup butter
   
   ## Instructions
   1. Mix dry ingredients
   2. Add butter
   3. Bake at 350°F for 20 minutes
   ```

## API Endpoints Required

### 1. URL Import Endpoint
**Endpoint**: `POST /api/import-recipe`
**Purpose**: Import recipes from website URLs
**Authentication**: Optional (recommend public version for GPT)

### 2. Text Import Endpoint  
**Endpoint**: `POST /api/import-paprika`
**Purpose**: Import recipes from text formats
**Authentication**: Optional (recommend public version for GPT)

## Creating Public Endpoints (Recommended)

Create public versions of your import endpoints that don't require authentication:

### Public URL Import Endpoint

```typescript
// src/app/api/public/import-recipe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchHtml } from '@/lib/fetchHtml'
import { parseRecipeFromHtml } from '@/lib/jsonld'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch and parse the recipe
    const htmlData = await fetchHtml(url)
    const parseResult = parseRecipeFromHtml(htmlData.html, htmlData.url)

    if (!parseResult.recipe) {
      return NextResponse.json({ 
        error: 'No recipe found on this page',
        confidence: parseResult.confidence,
        source: parseResult.source
      }, { status: 404 })
    }

    // Generate Paprika-style text for display
    const paprikaText = generatePaprikaText(parseResult.recipe)

    return NextResponse.json({
      recipe: parseResult.recipe,
      paprikaText,
      confidence: parseResult.confidence,
      source: parseResult.source,
      title: htmlData.title
    })

  } catch (error) {
    console.error('Public import recipe error:', error)
    return NextResponse.json(
      { error: 'Failed to import recipe' }, 
      { status: 500 }
    )
  }
}

function generatePaprikaText(recipe: any): string {
  // Same function as in your existing endpoint
  let text = `# ${recipe.name}\n\n`
  
  if (recipe.description) {
    text += `${recipe.description}\n\n`
  }

  if (recipe.prepTime || recipe.cookTime || recipe.totalTime) {
    text += `## Timing\n`
    if (recipe.prepTime) text += `Prep: ${recipe.prepTime}\n`
    if (recipe.cookTime) text += `Cook: ${recipe.cookTime}\n`
    if (recipe.totalTime) text += `Total: ${recipe.totalTime}\n`
    text += `\n`
  }

  if (recipe.recipeYield) {
    text += `Servings: ${recipe.recipeYield}\n\n`
  }

  if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
    text += `## Ingredients\n`
    recipe.recipeIngredient.forEach((ingredient: string) => {
      text += `- ${ingredient}\n`
    })
    text += `\n`
  }

  if (recipe.recipeInstructions) {
    text += `## Instructions\n`
    if (Array.isArray(recipe.recipeInstructions)) {
      recipe.recipeInstructions.forEach((instruction: any, index: number) => {
        const text_content = typeof instruction === 'string' ? instruction : instruction.text
        text += `${index + 1}. ${text_content}\n\n`
      })
    } else {
      text += `${recipe.recipeInstructions}\n`
    }
  }

  if (recipe.source || recipe.sourceUrl) {
    text += `\n---\n`
    text += `Source: ${recipe.source || recipe.sourceUrl}\n`
  }

  return text
}
```

### Public Text Import Endpoint

```typescript
// src/app/api/public/import-paprika/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parsePaprikaFromText } from '@/lib/paprika'; // You'll need to create this function

export async function POST(request: NextRequest) {
  try {
    const { recipe_text, format } = await request.json()
    
    if (!recipe_text) {
      return NextResponse.json({ error: 'Recipe text is required' }, { status: 400 })
    }

    // Parse the recipe text
    const recipe = await parsePaprikaFromText(recipe_text, format || 'auto-detect')

    if (!recipe) {
      return NextResponse.json({ 
        error: 'No valid recipe found in the text' 
      }, { status: 400 })
    }

    return NextResponse.json({
      recipe: recipe,
      success: true,
      format: format || 'auto-detect'
    })

  } catch (error) {
    console.error('Public import text error:', error)
    return NextResponse.json(
      { error: 'Failed to parse recipe text' }, 
      { status: 500 }
    )
  }
}
```

## Usage Examples

### For Users in ChatGPT:

1. **URL Import**:
   ```
   "Import this recipe: https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/"
   ```

2. **Text Import**:
   ```
   "Import this recipe text:
   
   # Grandma's Chocolate Chip Cookies
   
   The best chocolate chip cookies you'll ever taste!
   
   ## Ingredients
   - 2 1/4 cups all-purpose flour
   - 1 tsp baking soda
   - 1 tsp salt
   - 1 cup butter, softened
   - 3/4 cup granulated sugar
   - 3/4 cup brown sugar
   - 2 large eggs
   - 2 tsp vanilla extract
   - 2 cups chocolate chips
   
   ## Instructions
   1. Preheat oven to 375°F
   2. Mix flour, baking soda, and salt in a bowl
   3. Cream butter and sugars until fluffy
   4. Beat in eggs and vanilla
   5. Gradually blend in flour mixture
   6. Stir in chocolate chips
   7. Drop rounded tablespoons onto ungreased cookie sheets
   8. Bake 9-11 minutes until golden brown
   "
   ```

## Testing Checklist

- [ ] GPT responds to recipe URL requests
- [ ] GPT responds to recipe text requests
- [ ] URL scraping works with major recipe sites
- [ ] Text parsing works with Paprika format
- [ ] Text parsing works with Meal-Master format
- [ ] Error handling works for invalid URLs
- [ ] Error handling works for invalid text
- [ ] Response format is user-friendly
- [ ] GPT provides helpful suggestions

## Deployment

1. Deploy your public API endpoints to production
2. Update the OpenAPI schema with production URLs
3. Update the GPT configuration with production endpoints
4. Test thoroughly with real recipe URLs and text
5. Share the GPT with your users

## Security Considerations

- Public endpoints don't require authentication (by design for GPT usage)
- Consider rate limiting to prevent abuse
- Monitor usage and implement logging
- Consider adding API keys for production use
- Validate and sanitize all inputs

## Support

If users encounter issues:
1. Check the GPT logs for error messages
2. Verify the API endpoints are working
3. Test with known good recipe URLs
4. Provide fallback instructions for manual import

## Future Enhancements

- Add support for more recipe formats
- Implement recipe validation and quality scoring
- Add image extraction and processing
- Support for batch imports
- Integration with RecipeChef user accounts
- Recipe deduplication and merging
