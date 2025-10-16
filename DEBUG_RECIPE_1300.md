# Debug Recipe 1300 Import Issue

## Problem
Recipe 1300 only has ONE row in `user_recipe_ingredients` instead of one row per ingredient.

## Diagnostic Steps

### Step 1: Check What Was Imported

Run this in Supabase SQL Editor:

```sql
-- Check recipe details
SELECT 
  user_recipe_id,
  title,
  created_at
FROM user_recipes 
WHERE user_recipe_id = 1300;

-- Check ingredients (should be multiple rows)
SELECT 
  id,
  user_recipe_id,
  amount,
  unit,
  raw_name,
  ingredient_id
FROM user_recipe_ingredients 
WHERE user_recipe_id = 1300
ORDER BY id;
```

### Step 2: Check Browser Console

When you imported the recipe, check the browser console (F12 → Console tab) for:

1. **Parser output:**
   ```
   Look for: "Parsed ingredients:" or similar
   ```

2. **Ingredient array:**
   ```javascript
   // Should see something like:
   [
     { amount: "2", unit: "cups", name: "flour" },
     { amount: "1", unit: "cup", name: "sugar" },
     ...
   ]
   ```

3. **Errors:**
   ```
   Look for any red error messages
   ```

### Step 3: Possible Causes

#### Cause 1: Recipe Only Had One Ingredient
If the source URL only listed one ingredient, then one row is correct.

#### Cause 2: recipeIngredient Was Empty/Missing
```javascript
// Check if this appeared in console:
recipe.recipeIngredient = undefined  // ← Problem!
// or
recipe.recipeIngredient = []  // ← Problem!
```

#### Cause 3: Insert Failed Silently
The code doesn't check for insert errors properly.

#### Cause 4: Wrong Import Path Used
You might have used a different import method (manual entry, different page).

## Quick Test

### Import a Known Recipe

Try importing this URL which has multiple ingredients:
```
https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/
```

This recipe has 9 ingredients. After import, check:

```sql
SELECT COUNT(*) as ingredient_count
FROM user_recipe_ingredients
WHERE user_recipe_id = (
  SELECT MAX(user_recipe_id) FROM user_recipes
);
```

**Expected:** `ingredient_count = 9`
**If you see:** `ingredient_count = 1` → Something is wrong

## Questions to Answer

1. **What URL did you import for recipe 1300?**
   - This will help me test the same recipe

2. **Did you use the URL import or manual entry?**
   - URL: `/add` page with "Import from Web"
   - Manual: `/add/manual` page with form fields

3. **Can you share the browser console output?**
   - Open console (F12)
   - Re-import the same URL
   - Copy/paste any relevant log messages

4. **What does the SQL query show?**
   - How many rows in `user_recipe_ingredients` for recipe 1300?
   - What's in the `raw_name` field?

## Expected vs Actual

### Expected (for a recipe with 5 ingredients):
```
user_recipe_ingredients:
┌────┬─────────────────┬────────┬────────────┬──────────────┐
│ id │ user_recipe_id  │ amount │ unit       │ raw_name     │
├────┼─────────────────┼────────┼────────────┼──────────────┤
│ 1  │ 1300            │ "2"    │ "cups"     │ "flour"      │
│ 2  │ 1300            │ "1"    │ "cup"      │ "sugar"      │
│ 3  │ 1300            │ "1/2"  │ "teaspoon" │ "salt"       │
│ 4  │ 1300            │ "1"    │ "cup"      │ "butter"     │
│ 5  │ 1300            │ "2"    │ ""         │ "eggs"       │
└────┴─────────────────┴────────┴────────────┴──────────────┘
```
**Row count:** 5

### Actual (what you're seeing):
```
user_recipe_ingredients:
┌────┬─────────────────┬────────┬────────┬─────────────────────────┐
│ id │ user_recipe_id  │ amount │ unit   │ raw_name                │
├────┼─────────────────┼────────┬────────┼─────────────────────────┤
│ 1  │ 1300            │ ???    │ ???    │ ???                     │
└────┴─────────────────┴────────┴────────┴─────────────────────────┘
```
**Row count:** 1 ← Problem!

---

## Immediate Action

Please provide:

1. **SQL query result:** What do you see for recipe 1300?
2. **Source URL:** What recipe did you import?
3. **Import method:** Which page did you use?

This will help me diagnose why only one row was created!



