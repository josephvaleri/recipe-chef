# Shopping List with Amounts - Quick Start Guide

## What Changed?

The shopping list now shows **real quantities** instead of counts:
- **Before:** "Tomatoes: 3 count" ❌
- **After:** "Tomatoes: 2.5 lbs" ✅

## Installation (3 Steps)

### Step 1: Run Database Migration
Open Supabase SQL Editor and run:
```bash
cat add_amount_unit_to_shopping_list.sql
```
Copy and paste the contents into the SQL editor.

**What it does:**
- Adds `user_recipe_ingredient_id` column to link tables
- Attempts to match existing records automatically
- Reports any recipes that need re-analysis

### Step 2: Check Results
```sql
-- See if any recipes need re-analysis
SELECT COUNT(*) FROM user_recipe_ingredients_detail 
WHERE user_recipe_ingredient_id IS NULL;
```

- **If 0:** Perfect! All recipes linked successfully ✅
- **If > 0:** Some recipes need re-analysis (see Step 3)

### Step 3: Re-analyze Recipes (if needed)
If Step 2 showed unmatched records:

**Option A:** Let users re-analyze via UI
```sql
-- Delete unmatched detail records
DELETE FROM user_recipe_ingredients_detail 
WHERE user_recipe_ingredient_id IS NULL;
```
Users will see "Analyze Ingredients" button on recipe edit page.

**Option B:** Find and fix specific recipes
```sql
-- List affected recipes
SELECT ur.user_recipe_id, ur.title
FROM user_recipes ur
JOIN user_recipe_ingredients_detail urid ON ur.user_recipe_id = urid.user_recipe_id
WHERE urid.user_recipe_ingredient_id IS NULL
GROUP BY ur.user_recipe_id, ur.title;
```

## Testing

### Test 1: Import New Recipe
1. Go to `/add`
2. Import "Viking Stew" from AllRecipes
3. Check that ingredients are parsed correctly
4. Shopping list should show amounts

### Test 2: Shopping List Generation
1. Add 2-3 recipes to your calendar
2. Go to `/shopping-list`
3. Generate list for 7 days, 4 people
4. Verify:
   - Amounts show (not "count")
   - Scaling works (try different people counts)
   - Aggregation works (same ingredient from multiple recipes)

### Test 3: Scaling
Recipe serves 4, cooking for 6:
- Original: "2 cups flour"
- Expected: "3 cups flour" (2 × 6/4 = 3)

## Files Changed

1. **create_user_recipe_ingredients_detail_table.sql** - Schema definition
2. **add_amount_unit_to_shopping_list.sql** - Migration script
3. **src/app/api/ingredients/analyze/route.ts** - Sets FK when analyzing
4. **src/app/shopping-list/page.tsx** - Uses FK to fetch amounts

## Troubleshooting

### "Shopping list is empty"
**Cause:** Recipes not added to meal plan
**Fix:** Go to `/calendar`, add recipes to dates

### "Amounts show as 0"  
**Cause:** Recipe analyzed before FK was added
**Fix:** Edit recipe → click "Analyze Ingredients" button

### "Amounts don't scale correctly"
**Cause:** Recipe servings is blank
**Fix:** Edit recipe → set servings field (e.g., "4")

### "Query error: column does not exist"
**Cause:** Migration not run
**Fix:** Re-run Step 1 (database migration)

## How It Works (Simple)

```
1. Recipe Import
   "4.5 pounds pork" → Saved with amount + unit

2. Ingredient Analysis  
   Matches "pork" to ingredient database
   Links to original row (new!)

3. Shopping List
   Joins tables via link
   Gets amount (4.5) and unit (pounds)
   Scales for people count
   Shows "Pork: 6 lbs"
```

## What's Next?

Future enhancements:
1. **Unit Conversion:** "8 tbsp" → "0.5 cup"
2. **Smart Rounding:** "1.08 lbs" → "1 lb"
3. **Fractional Display:** "0.5 cup" → "½ cup"
4. **Store Sections:** Group by store layout

## Documentation

See detailed docs:
- `SHOPPING_LIST_AMOUNT_SOLUTION.md` - Technical explanation
- `SHOPPING_LIST_DATA_FLOW.md` - Visual diagrams
- `SHOPPING_LIST_IMPLEMENTATION_SUMMARY.md` - Complete summary

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify migration ran successfully
3. Check that FK constraint exists: `\d user_recipe_ingredients_detail`
4. Re-analyze affected recipes

## Rollback

If needed, you can rollback:
```sql
ALTER TABLE user_recipe_ingredients_detail 
DROP COLUMN IF EXISTS user_recipe_ingredient_id;
```

Then revert code changes. Shopping list will fall back to showing counts.

