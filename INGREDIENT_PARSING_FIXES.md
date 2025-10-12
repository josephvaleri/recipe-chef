# Ingredient Parsing Fixes - Global Recipe Analysis

## Problem
The Detailed Ingredient Analysis on global recipe pages couldn't find these 3 ingredients:
1. "1 orange, quartered" 
2. "1 lemon, quartered"
3. "2 (14 ounce) cans reduced-sodium chicken broth"

## Root Causes Identified

### Issue 1: Preparation Methods Not Removed
**Problem:** Words like "quartered", "halved" were NOT being removed during text cleaning, so the parser was searching for "quartered" instead of "orange" or "lemon".

**Fix:** Added preparation method words to the removal regex at line 591:
- Added: `halved`, `quartered`, `reduced`, `sodium`

### Issue 2: Important Ingredients Excluded from Search
**Problem:** Line 640 had "chicken", "vegetable", "broth", and "orange" in the exclusion filter, preventing them from being found.

**Fix:** Removed these words from the exclusion list:
- Removed: `chicken`, `vegetable`, `broth`, `orange`
- These are actual ingredients and should never be excluded!

### Issue 3: Common Ingredients List Incomplete  
**Problem:** "lemon", "orange", and "broth" weren't in the common ingredients detection list.

**Fix:** Added to line 647:
- Added: `lemon`, `orange`, `broth`

### Issue 4: Two-Word Ingredient Search Too Limited
**Problem:** For "cans reduced-sodium chicken broth", the parser only checked the first 3 word pairs:
- Checked: "cans reduced", "reduced sodium", "sodium chicken"
- Missed: "chicken broth" (the 4th pair!)

**Fix:** Increased limit from 3 to 6 word pairs (line 489):
- Now checks up to 6 consecutive word pairs to catch ingredients later in the text

### Issue 5: **Single-Word Ingredients Matched Before Two-Word (CRITICAL)**
**Problem:** The common ingredients search found "chicken" BEFORE checking for "chicken broth":
- Cleaned text: "cans chicken broth"
- Found: "chicken" from single-word list → STOPPED
- Never searched: "chicken broth" (which exists in aliases table)

**Fix:** Reorganized ingredient detection to check two-word ingredients FIRST (lines 646-675):
- Created `commonTwoWordIngredients` list with items like "chicken broth", "roasting chicken", "chicken breast", etc.
- Search two-word ingredients BEFORE single-word ingredients
- Only search single-word list if no two-word match found
- This ensures "chicken broth" is found instead of just "chicken"

### Issue 6: **Ingredient Parts Removed as Preparation Methods**
**Problem:** Words like "roasting", "wings", "breast", "thighs", "drumsticks" were in the removal list, but these are part of ingredient names:
- "roasting chickens" became just "chickens" (roasting removed!)
- "Roasting Chicken" is a specific ingredient type in the database

**Fix:** Removed these words from the removal regex at line 591:
- Removed: `roasting`, `wings`, `thighs`, `breast`, `breasts`, `drumsticks`, `legs`, `meat`
- These words are parts of ingredient names and should be preserved
- Still remove: `neck`, `giblets`, `discarded` (these are truly non-ingredient words)

## How It Works Now

### Example 1: "1 orange, quartered"
1. **Light cleaning:** "orange quartered"
2. **Two-word check:** "orange quartered" (not in two_word_ingredients)
3. **Heavy cleaning:** Removes "quartered" → "orange"
4. **Common ingredient check:** Finds "orange" in commonIngredients list
5. **Database search:** Searches for "orange" → ✅ MATCH

### Example 2: "1 lemon, quartered"
1. **Light cleaning:** "lemon quartered"
2. **Two-word check:** "lemon quartered" (not in two_word_ingredients)
3. **Heavy cleaning:** Removes "quartered" → "lemon"
4. **Common ingredient check:** Finds "lemon" in commonIngredients list
5. **Database search:** Searches for "lemon" → ✅ MATCH

### Example 3: "2 (14 ounce) cans reduced-sodium chicken broth"
1. **Light cleaning:** "cans reduced sodium chicken broth"
2. **Two-word check (first 6 pairs):** No match in two_word_ingredients table
3. **Heavy cleaning:** Removes "reduced", "sodium" → "cans chicken broth"
4. **Common TWO-word ingredient check:** Finds "**chicken broth**" ✅ (checked BEFORE single-word "chicken")
5. **Database search:** Searches for "chicken broth" → Finds in aliases table → ✅ **MATCH**

### Example 4: "1 (5-6 lb) roasting chickens, neck and giblets discarded"
1. **Light cleaning:** "roasting chickens neck and giblets discarded"
2. **Heavy cleaning:** "roasting chickens" (removed: neck, giblets, discarded - NOT roasting!)
3. **Common TWO-word ingredient check:** Finds "**roasting chicken**" ✅ (plural "chickens" handled)
4. **Database search:** Searches for "roasting chicken"/"roasting chickens" → ✅ **MATCH**

## Files Modified
- `/Users/josephvaleri/recipe-chef/src/app/api/ingredients/search/route.ts`

## Testing Recommendations
1. Navigate to global recipe #280 (or any recipe with these ingredients)
2. Click "Run Detailed Ingredient Analysis"
3. Verify all 4 ingredients are now found:
   - ✅ Orange (ID: 601)
   - ✅ Lemon (ID: 13)
   - ✅ Chicken Broth (via aliases table)
   - ✅ Chicken (for "roasting chickens")
4. Check the console logs to see the parsing flow - you should see:
   ```
   Fallback ingredients: [ 'chicken broth' ]  ← NOT just 'chicken'!
   processBatch: Found alias match: Chicken Broth
   ```

## Additional Verification Needed
Run the SQL script `verify_ingredients.sql` to confirm these ingredients exist in your database:
- Orange (should be in ingredients table)
- Lemon (should be in ingredients table)
- Chicken Broth (might be in ingredients or two_word_ingredients table)

If any are missing, they need to be added to the database first.

