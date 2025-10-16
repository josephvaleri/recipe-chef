# Missing Ingredient Diagnostic - Recipe 450

## Problem
The ingredient line below doesn't appear in EITHER the found or unfound results when running "Detailed Ingredient Analysis":
```
1 habanero pepper, seeded and chopped (or real Peruvian Aji Amarillo, if you can find it)
```

## Root Cause Analysis

### Why It's Not Appearing

When an ingredient doesn't show in **either** list, it means it's not being sent to the search API at all. This happens because:

**The ingredient data is missing or incorrectly formatted in the database**

### How Ingredients Are Loaded

From `src/app/global-recipe/[id]/page.tsx` (lines 269-278):

```typescript
const ingredientLines = recipe.ingredients.flatMap((ing: any) => {
  if (ing.raw_name) {
    // Split by line breaks to get individual ingredient lines
    return ing.raw_name.split('\n').filter((line: string) => line.trim())
  } else {
    // Fallback to structured data
    const fullText = `${ing.amount || ''}${ing.unit ? ` ${ing.unit}` : ''} ${ing.ingredient?.name || ''}`.trim()
    return fullText.split('\n').filter(line => line.trim())
  }
})
```

**Key Point:** The code looks for `raw_name` field in `global_recipe_ingredients` table. If this field is empty, NULL, or doesn't exist for this ingredient, it won't be processed.

## Diagnostic Steps

### Step 1: Check the Database

Run the diagnostic SQL script:
```bash
# View the script
cat check_recipe_450.sql

# Or run it against your Supabase database
```

This will show you:
1. All ingredients currently stored for recipe 450
2. Whether the habanero ingredient exists
3. The format of the `raw_name` field for each ingredient

### Step 2: Identify the Issue

Look for these common problems:

**A) Ingredient Row Missing Entirely**
- The ingredient was never imported to the database
- Solution: Add it using the provided SQL script

**B) `raw_name` Field is NULL or Empty**
- The ingredient row exists but `raw_name` is not populated
- Solution: Update the row with the correct `raw_name` value

**C) Weird Formatting**
- Special characters, encoding issues, or line breaks causing problems
- Solution: Clean and re-insert the ingredient

**D) Wrong Table**
- Ingredient is in a different table or column
- Solution: Copy to correct location

## Fix: Add Missing Ingredient

If the ingredient is missing, run this script:
```bash
# This script will:
# 1. Check if Habanero Pepper exists in ingredients table
# 2. Create it if needed
# 3. Add the ingredient line to recipe 450
# 4. Verify the addition

cat add_habanero_ingredient_450.sql
# Then run against your database
```

## After Fixing

Once you've added or fixed the ingredient in the database:

1. **Refresh the recipe page** (hard refresh: Cmd+Shift+R or Ctrl+Shift+F5)
2. **Click "Run Detailed Ingredient Analysis"** again
3. **Check console logs** for:
   ```
   Parsed ingredient lines: [...]  ← Should now include habanero
   Number of ingredient lines: X  ← Should be +1
   processBatch: Processing ingredient X/Y: "1 habanero pepper..."
   ```

## Expected Result

After fixing, the ingredient should now appear in **one of these**:

### ✅ If Found
```
processBatch: Found match: Habanero Pepper (ID: XXX)
```
Or if using an alias:
```
processBatch: Found alias match: habanero → Habanero Pepper
```

### ❌ If Not Found (but now in unmatched list)
```
processBatch: NO MATCH found for ingredient: "1 habanero pepper..."
processBatch: Searched terms were: [ 'habanero pepper', 'habanero' ]
```

This is fine! It means the ingredient is now being processed. You can then:
- Add "Habanero Pepper" to the ingredients table if missing
- Add aliases for common variations
- Re-run the analysis

## Prevention

To prevent this issue in the future:

1. **Always populate `raw_name` field** when importing recipes
2. **Verify import completeness** - check ingredient count matches source
3. **Test detailed analysis** immediately after import to catch issues early

## SQL Queries Created

Two SQL scripts have been created for you:

1. **`check_recipe_450.sql`** - Diagnostic queries
2. **`add_habanero_ingredient_450.sql`** - Fix script to add missing ingredient

Run these against your Supabase database to resolve the issue.



