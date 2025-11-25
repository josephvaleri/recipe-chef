# Shopping List: Table Relationship Explanation

## The Problem

You have **TWO separate tables** that store different information about ingredients:

### 1. `user_recipe_ingredients` (Basic Storage)
```sql
CREATE TABLE user_recipe_ingredients (
  id SERIAL PRIMARY KEY,
  user_recipe_id BIGINT NOT NULL,
  ingredient_id INT,          -- ⚠️ NULL until analysis!
  raw_name TEXT,              -- "2 cups flour"
  amount TEXT,                -- "2" (NEW!)
  unit TEXT                   -- "cup" (NEW!)
);
```

**What it stores:**
- ✅ The `amount` and `unit` (what we just added!)
- ✅ The `raw_name` (original ingredient text)
- ⚠️ `ingredient_id` is **NULL** initially (not populated during import)

**Example rows:**
```
id | user_recipe_id | ingredient_id | raw_name        | amount | unit
---+----------------+---------------+-----------------+--------+------
1  | 100            | NULL          | flour           | 2      | cup
2  | 100            | NULL          | olive oil       | 2      | tablespoons
3  | 100            | NULL          | salt            | 1/2    | teaspoon
```

---

### 2. `user_recipe_ingredients_detail` (Analysis Results)
```sql
CREATE TABLE user_recipe_ingredients_detail (
  detail_id SERIAL PRIMARY KEY,
  user_recipe_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,  -- ✅ Populated after analysis!
  original_text TEXT NOT NULL,     -- Same as raw_name
  matched_term TEXT NOT NULL,      -- "Flour" (from ingredients table)
  match_type VARCHAR(20),           -- 'exact' or 'alias'
  matched_alias TEXT,
  UNIQUE(user_recipe_id, ingredient_id)  -- One row per ingredient per recipe
);
```

**What it stores:**
- ✅ The `ingredient_id` (matched to database)
- ✅ The `original_text` (same as `raw_name` from basic table)
- ✅ The `matched_term` (canonical ingredient name)
- ❌ Does **NOT** store `amount` or `unit`

**Example rows:**
```
detail_id | user_recipe_id | ingredient_id | original_text   | matched_term
----------+----------------+---------------+-----------------+--------------
1         | 100            | 123           | flour           | Flour
2         | 100            | 456           | olive oil       | Olive Oil
3         | 100            | 789           | salt            | Salt
```

---

## The Relationship

These tables are related by **TWO columns**:
1. `user_recipe_id` (both tables)
2. `raw_name` = `original_text` (the ingredient text)

**JOIN condition:**
```sql
FROM user_recipe_ingredients uri
JOIN user_recipe_ingredients_detail urid 
  ON uri.user_recipe_id = urid.user_recipe_id 
  AND uri.raw_name = urid.original_text
```

---

## Why This Design?

### Import Phase (URL/Paprika)
```typescript
// Only populates user_recipe_ingredients
INSERT INTO user_recipe_ingredients (user_recipe_id, raw_name, amount, unit)
VALUES (100, 'flour', '2', 'cup');
```
- ✅ Fast import (no database lookups)
- ✅ Stores amount/unit for later
- ⚠️ No ingredient_id yet

### Analysis Phase ("Detailed Ingredient Analysis" button)
```typescript
// Populates user_recipe_ingredients_detail
INSERT INTO user_recipe_ingredients_detail (user_recipe_id, ingredient_id, original_text, matched_term)
VALUES (100, 123, 'flour', 'Flour');
```
- ✅ Matches to ingredient database
- ✅ Stores ingredient_id for search/categorization
- ⚠️ Does NOT update user_recipe_ingredients.ingredient_id

---

## The Issue

**Currently, `user_recipe_ingredients.ingredient_id` is NEVER populated!**

This means:
- ❌ You can't join these tables using `ingredient_id`
- ✅ You CAN join using `raw_name` = `original_text`

---

## Shopping List Query Strategy

### Option 1: Join Using Text (CURRENT)
```sql
SELECT 
  uri.amount,
  uri.unit,
  uri.raw_name,
  urid.ingredient_id,
  i.name as ingredient_name,
  ic.name as category_name
FROM user_recipe_ingredients uri
JOIN user_recipe_ingredients_detail urid 
  ON uri.user_recipe_id = urid.user_recipe_id 
  AND uri.raw_name = urid.original_text
JOIN ingredients i ON urid.ingredient_id = i.ingredient_id
JOIN ingredient_categories ic ON i.category_id = ic.category_id
WHERE uri.user_recipe_id IN (SELECT user_recipe_id FROM meal_plan WHERE ...)
```

**Pros:**
- ✅ Works with current schema
- ✅ No schema changes needed

**Cons:**
- ⚠️ Text matching can be fragile
- ⚠️ If `raw_name` and `original_text` don't match exactly, join fails

---

### Option 2: Update Analyze to Populate ingredient_id (BETTER)

**Step 1:** Modify `/api/ingredients/analyze` to UPDATE `user_recipe_ingredients`:
```typescript
// After saving to user_recipe_ingredients_detail...
for (const matched of matchedIngredients) {
  await supabase
    .from('user_recipe_ingredients')
    .update({ ingredient_id: matched.ingredient_id })
    .eq('user_recipe_id', user_recipe_id)
    .eq('raw_name', matched.original_text)
}
```

**Step 2:** Shopping list can now join using `ingredient_id`:
```sql
SELECT 
  uri.amount,
  uri.unit,
  uri.raw_name,
  uri.ingredient_id,  -- Now populated!
  i.name as ingredient_name,
  ic.name as category_name
FROM user_recipe_ingredients uri
JOIN ingredients i ON uri.ingredient_id = i.ingredient_id
JOIN ingredient_categories ic ON i.category_id = ic.category_id
WHERE uri.user_recipe_id IN (SELECT user_recipe_id FROM meal_plan WHERE ...)
  AND uri.ingredient_id IS NOT NULL  -- Only analyzed ingredients
```

**Pros:**
- ✅ More reliable join (integer vs text)
- ✅ Simpler query (one less table)
- ✅ Consistent with schema design

**Cons:**
- ⚠️ Requires updating analyze endpoint

---

## Current Shopping List Code Issue

Looking at `src/app/shopping-list/page.tsx` line 96:

```typescript
const { data: ingredients } = await supabase
  .from('user_recipe_ingredients_detail')  // ❌ Only has ingredient_id
  .select(`
    original_text,
    matched_term,
    ingredients(
      ingredient_id,
      name,
      category_id
    )
  `)
```

**Problem:** This table does **NOT** have `amount` or `unit`!

---

## Recommended Solution

### Step 1: Update Shopping List Query
Query `user_recipe_ingredients` (has amount/unit) and JOIN with detail table:

```typescript
const { data: ingredients } = await supabase
  .from('user_recipe_ingredients')  // ✅ Has amount/unit
  .select(`
    amount,
    unit,
    raw_name,
    user_recipe_id,
    user_recipe_ingredients_detail!inner (
      ingredient_id,
      original_text,
      matched_term,
      ingredients (
        ingredient_id,
        name,
        category_id,
        ingredient_categories (name)
      )
    )
  `)
  .eq('user_recipe_id', mealPlan.user_recipe_id)
```

### Step 2: Aggregate with Real Amounts
```typescript
allIngredients.forEach((item: any) => {
  const servings = parseFloat(recipe.servings) || 4
  const scaleFactor = params.people / servings
  
  // Parse amount (handle fractions, decimals, ranges)
  const amount = parseAmountToNumber(item.amount)  // "1/2" → 0.5
  const scaledAmount = amount * scaleFactor
  
  const ingredientId = item.user_recipe_ingredients_detail.ingredient_id
  const unit = item.unit
  const key = `${ingredientId}-${unit}`  // Group by ingredient + unit
  
  if (ingredientMap.has(key)) {
    ingredientMap.get(key).quantity += scaledAmount
  } else {
    ingredientMap.set(key, {
      ingredient_id: ingredientId,
      ingredient_name: item.user_recipe_ingredients_detail.ingredients.name,
      quantity: scaledAmount,
      unit: unit,
      category_name: item.user_recipe_ingredients_detail.ingredients.ingredient_categories.name
    })
  }
})
```

**Result:**
```
✓ Flour — 3 cups        (aggregated: 2 cups + 1 cup)
✓ Olive Oil — 2 tbsp    (from original amount/unit)
✓ Salt — 1.5 tsp        (scaled: 1 tsp × 1.5)
```

---

## Alternative: Populate ingredient_id in Main Table

**Update the analyze endpoint** to also update `user_recipe_ingredients.ingredient_id`:

```typescript
// In /api/ingredients/analyze
for (const matched of matchedIngredients) {
  await supabase
    .from('user_recipe_ingredients')
    .update({ ingredient_id: matched.ingredient_id })
    .eq('user_recipe_id', user_recipe_id)
    .eq('raw_name', matched.original_text)
}
```

**Then shopping list becomes simpler:**
```typescript
const { data: ingredients } = await supabase
  .from('user_recipe_ingredients')
  .select(`
    amount,
    unit,
    raw_name,
    ingredient_id,
    ingredients!inner (
      name,
      category_id,
      ingredient_categories (name)
    )
  `)
  .eq('user_recipe_id', mealPlan.user_recipe_id)
  .not('ingredient_id', 'is', null)  // Only analyzed ingredients
```

---

## Summary

**The mapping works like this:**

```
user_recipe_ingredients          user_recipe_ingredients_detail
━━━━━━━━━━━━━━━━━━━━━━━━━━       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
user_recipe_id: 100              user_recipe_id: 100
raw_name: "flour"           ───► original_text: "flour"
amount: "2"                      ingredient_id: 123 → Flour
unit: "cup"
ingredient_id: NULL
```

**JOIN condition:**
```sql
uri.user_recipe_id = urid.user_recipe_id 
AND uri.raw_name = urid.original_text
```

**Result:**
```
amount="2", unit="cup", ingredient_id=123, name="Flour", category="Grains"
```

This gives the shopping list everything it needs! ✅









