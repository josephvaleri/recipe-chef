# Fish and Lime Ingredient Fixes - Recipe 450

## Problem
Two ingredients from recipe 450 weren't being found:
1. **"2 lbs firm white fish fillets, cubed"**
2. **"8 -12 limes, freshly squeezed and strained to remove pulp, enough to cover fish"**

## Root Causes

### Issue 1: Two-Word Ingredients Not in Lists
**Problem:** "white fish" and "fish fillets" weren't in the `commonTwoWordIngredients` list, so the parser was falling back to single-word "fish" which might not match the specific ingredient in the database.

### Issue 2: Lime Not in Common Ingredients  
**Problem:** "lime" wasn't in the `commonIngredients` list. While "lemon" was added, "lime" was overlooked.

### Issue 3: Texture/Preparation Descriptors Not Removed
**Problem:** Words like "firm", "fresh", "freshly", "squeezed", "strained", "cubed" weren't being removed, making the cleaned text longer and potentially interfering with matching.

## Fixes Applied

### 1. Added Fish-Related Two-Word Ingredients (Line 651)
```javascript
'white fish', 'fish fillets', 'fish fillet', 'cod fillets', 'salmon fillets'
```

**Why:** These are specific types of fish that should match before just "fish". This ensures "white fish fillets" finds "White Fish" or "Fish Fillets" instead of just "Fish".

### 2. Added Lime and Fish to Single-Word Ingredients (Line 669)
```javascript
'lime', 'fillets', 'cod', 'salmon', 'tilapia', 'halibut', 'snapper'
```

**Why:** 
- "lime" as a fallback if "limes" doesn't work
- Common fish types as fallbacks
- "fillets" to catch any fillet references

### 3. Added Descriptors to Removal List (Line 591)
```javascript
'firm', 'tender', 'fresh', 'freshly', 'squeezed', 'strained', 'pulp', 'enough', 'cover', 'cubed', 'cubes'
```

**Why:** These descriptive words don't help match ingredients and should be stripped out during cleaning.

## How It Works Now

### Example 1: "2 lbs firm white fish fillets, cubed"
1. **Numbers & units removed:** "2 lbs" → removed
2. **Light cleaning:** "firm white fish fillets cubed"
3. **Two-word check:** Checks first 6 pairs including "white fish", "fish fillets"
4. **Heavy cleaning:** Removes "firm", "cubed" → "white fish fillets"
5. **Common TWO-word ingredient check:** Finds "**white fish**" or "**fish fillets**" ✅
6. **Database search:** Searches for "white fish"/"fish fillets" → ✅ **MATCH**

### Example 2: "8 -12 limes, freshly squeezed and strained to remove pulp, enough to cover fish"
1. **Numbers & ranges removed:** "8 -12" → removed
2. **Light cleaning:** "limes freshly squeezed and strained to remove pulp enough to cover fish"
3. **Heavy cleaning:** Removes "freshly", "squeezed", "strained", "pulp", "enough", "cover", "fish" → "limes"
4. **Common single-word ingredient check:** Finds "**lime**" ✅ (handles plural)
5. **Database search:** Searches for "lime"/"limes" (with plural variations) → ✅ **MATCH**

## Database Setup Required

These ingredients need to exist in your database. Run the SQL script:

```bash
# This will:
# 1. Check if White Fish, Fish Fillets, Fish Fillet, and Lime exist
# 2. Add them to ingredients table if missing
# 3. Add to two_word_ingredients table
# 4. Add aliases for plural forms
# 5. Verify all additions

cat add_fish_and_lime_ingredients.sql
# Then run against your Supabase database
```

## Testing

After running the SQL script:

1. **Hard refresh** the recipe page (Cmd+Shift+R / Ctrl+Shift+F5)
2. **Click "Run Detailed Ingredient Analysis"**
3. **Check console logs** for:

```
Cleaned text: white fish fillets
Fallback ingredients: [ 'white fish' ]
processBatch: Found match: White Fish (ID: XXX)

Cleaned text: limes
Fallback ingredients: [ 'lime' ]
processBatch: Found match: Lime (ID: XXX)
```

## Files Modified
- `/Users/josephvaleri/recipe-chef/src/app/api/ingredients/search/route.ts`

## Files Created
- `add_fish_and_lime_ingredients.sql` - Database setup script

## Summary of All Changes

### Common Two-Word Ingredients (NOW INCLUDES):
- ✅ chicken broth, beef broth, vegetable broth
- ✅ roasting chicken, whole chicken, chicken breast, etc.
- ✅ **white fish, fish fillets, fish fillet** ← NEW
- ✅ olive oil, soy sauce, black pepper, etc.

### Common Single-Word Ingredients (NOW INCLUDES):
- ✅ eggs, garlic, onion, carrot, celery, tomato
- ✅ chicken, beef, pork, fish, shrimp, lobster
- ✅ lemon, orange, broth
- ✅ **lime, fillets, cod, salmon, tilapia, halibut, snapper** ← NEW

### Removal List (NOW REMOVES):
- ✅ Preparation methods: chopped, diced, minced, sliced, grated, etc.
- ✅ Sizes: large, medium, small
- ✅ Conditions: fresh, dried, frozen, canned, raw, cooked
- ✅ **Textures: firm, tender** ← NEW
- ✅ **Actions: freshly, squeezed, strained, cubed** ← NEW
- ✅ **Descriptors: pulp, enough, cover** ← NEW


