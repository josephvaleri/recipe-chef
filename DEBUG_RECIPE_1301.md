# Debug Recipe 1301 - Only One Ingredient Saved

## Problem
Recipe 1301 only created ONE row with ONE ingredient, but the recipe should have multiple ingredients.

## Diagnostic Steps

### Step 1: Check Browser Console Logs

When you imported recipe 1301, the browser console should show:

**Open Console (F12 → Console tab) and look for:**

1. **Ingredient array after normalization:**
   ```
   Ingredient array for parsing: [...]
   Number of ingredients: X
   ```
   **Question:** What number does it show? Is it 1 or more?

2. **Parsed ingredients:**
   ```
   Inserting ingredients: [...]
   ```
   **Question:** How many items are in this array?

### Step 2: Check Database

Run this in Supabase SQL Editor:

```sql
-- Check recipe 1301
SELECT 
  user_recipe_id,
  title
FROM user_recipes 
WHERE user_recipe_id = 1301;

-- Check how many ingredient rows
SELECT COUNT(*) as ingredient_count
FROM user_recipe_ingredients 
WHERE user_recipe_id = 1301;

-- Check the actual ingredient data
SELECT 
  id,
  amount,
  unit,
  raw_name,
  LENGTH(raw_name) as name_length
FROM user_recipe_ingredients 
WHERE user_recipe_id = 1301
ORDER BY id;
```

**Questions:**
- How many rows does `ingredient_count` show?
- What's in the `raw_name` field?
- Is it ONE ingredient or multiple ingredients concatenated?

### Step 3: What URL Did You Import?

Please share the URL you imported for recipe 1301 so I can test it myself.

---

## Possible Causes

### Cause A: Only One Ingredient in Array
The recipe really only has one ingredient (unlikely).

**Console would show:**
```
Number of ingredients: 1
Inserting ingredients: [{ amount: "2", unit: "cups", raw_name: "flour" }]
```

### Cause B: Insert Only Saved First Item
The array has multiple ingredients, but `.insert()` only saved the first one.

**Console would show:**
```
Number of ingredients: 5
Inserting ingredients: [
  { amount: "2", unit: "cups", raw_name: "flour" },
  { amount: "1", unit: "cup", raw_name: "sugar" },
  ...
]
```
But database only has 1 row.

### Cause C: Insert Error Not Caught
The insert failed but we didn't see the error.

### Cause D: Parsing Failed
The parser couldn't parse the ingredients properly.

**Console would show:**
```
Number of ingredients: 5
Inserting ingredients: [
  { amount: "", unit: "", raw_name: "2 cups flour 1 cup sugar..." }
]
```

---

## Next Steps

Please provide:

1. **Console logs** - What did the browser console show?
2. **SQL results** - What does the database query show?
3. **URL** - What recipe did you import?

This will help me identify exactly where the problem is!



