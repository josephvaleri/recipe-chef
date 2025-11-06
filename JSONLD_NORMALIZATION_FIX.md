# JSON-LD Recipe Import - Object Normalization Fix

## Problem
After importing recipes from URLs, complex Schema.org objects were appearing in edit form fields instead of simple values:

```json
// Instead of just the URL string, fields showed:
{
  "@type":"ImageObject",
  "url":"https://...",
  "height":1125,
  "width":1500
}
```

## Root Cause
The JSON-LD parser was extracting raw Schema.org structured data objects without normalizing them to simple values that the UI expects.

## Schema.org Object Types That Needed Normalization

### 1. ImageObject
**Raw format:**
```json
{
  "@type": "ImageObject",
  "url": "https://example.com/image.jpg",
  "height": 1125,
  "width": 1500
}
```

**Normalized to:** `"https://example.com/image.jpg"`

### 2. Person / Organization (Author)
**Raw format:**
```json
{
  "@type": "Person",
  "name": "Chef John"
}
```

**Normalized to:** `{ name: "Chef John" }`

### 3. HowToStep / HowToSection (Instructions)
**Raw format:**
```json
{
  "@type": "HowToStep",
  "text": "Mix the ingredients"
}
```

**Normalized to:** `"Mix the ingredients"`

### 4. NutritionInformation
**Raw format:**
```json
{
  "@type": "NutritionInformation",
  "calories": "250 calories",
  "proteinContent": "10g"
}
```

**Normalized to:** Simple object with just the values

### 5. AggregateRating
**Raw format:**
```json
{
  "@type": "AggregateRating",
  "ratingValue": 4.5,
  "reviewCount": 123
}
```

**Normalized to:** `{ ratingValue: 4.5, reviewCount: 123 }`

## Fixes Applied

### Fix 1: ImageObject Normalization (Lines 262-278)
```typescript
const normalizeImageUrl = (img: any): string => {
  if (typeof img === 'string') return img
  if (img?.url) return img.url // ImageObject with url property
  if (img?.contentUrl) return img.contentUrl // Alternative property
  return ''
}
```

**Handles:**
- String URLs (already normalized)
- ImageObject with `url` property
- ImageObject with `contentUrl` property (alternative)
- Arrays of images
- Missing/invalid images

### Fix 2: Author Normalization (Lines 279-288)
```typescript
if (typeof data.author === 'string') {
  recipe.author = decode(data.author)
} else if (data.author?.name) {
  recipe.author = { name: decode(data.author.name) }
} else if (data.author?.['@type'] === 'Person' || data.author?.['@type'] === 'Organization') {
  recipe.author = { name: decode(data.author.name || 'Unknown') }
}
```

**Handles:**
- String author names
- Person objects
- Organization objects
- Missing author names

### Fix 3: Instructions Normalization (Lines 302-327)
```typescript
const normalizeInstruction = (inst: any): string => {
  if (typeof inst === 'string') return decode(inst)
  if (inst?.text) return decode(inst.text)
  if (inst?.['@type'] === 'HowToStep' && inst.text) return decode(inst.text)
  if (inst?.['@type'] === 'HowToSection' && inst.itemListElement) {
    // Flatten HowToSection into individual steps
    return inst.itemListElement
      .map((step: any) => normalizeInstruction(step))
      .filter((s: string) => s)
      .join('\n\n')
  }
  return ''
}
```

**Handles:**
- String instructions
- HowToStep objects
- HowToSection objects (flattens nested steps)
- Arrays of mixed types
- Missing text

### Fix 4: RecipeYield Normalization (Lines 294-301)
```typescript
if (typeof data.recipeYield === 'string' || typeof data.recipeYield === 'number') {
  recipe.recipeYield = String(data.recipeYield)
} else if (data.recipeYield?.value) {
  recipe.recipeYield = String(data.recipeYield.value)
}
```

**Handles:**
- String values ("4 servings")
- Number values (4)
- Objects with value property
- Ensures always returns string

### Fix 5: Nutrition & Rating (Lines 329-349)
Properly extracts values from complex nutrition and rating objects.

## Files Modified
- `src/lib/jsonld.ts` - Enhanced `normalizeRecipeData()` function

## Testing
Import any recipe from:
- AllRecipes
- Food Network
- NYTimes Cooking
- Bon Appétit
- Serious Eats

All fields should now display clean, simple values on the edit page!

## Before/After Example

### Before (Raw JSON in field):
```
Image URL: {"@type":"ImageObject","url":"https://...","height":1125}
Author: {"@type":"Person","name":"Chef John"}
```

### After (Clean values):
```
Image URL: https://...
Author: Chef John
```

## Schema.org Reference
- [Recipe](https://schema.org/Recipe)
- [ImageObject](https://schema.org/ImageObject)
- [HowToStep](https://schema.org/HowToStep)
- [NutritionInformation](https://schema.org/NutritionInformation)
- [AggregateRating](https://schema.org/AggregateRating)








