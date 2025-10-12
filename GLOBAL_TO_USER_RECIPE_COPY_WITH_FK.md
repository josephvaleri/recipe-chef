# Global to User Recipe Copy - FK Preservation

## Architecture Overview

### Recipe Types
1. **Global Recipes**: Curated, moderated recipes in the global cookbook
2. **User Recipes**: Personal recipes owned by individual users

### Data Flow
```
Global Recipe (Template)
    ↓ [User clicks "Add to Cookbook"]
User Recipe (Personal Copy)
    ↓ [User adds to Meal Plan]
Shopping List
```

## Table Relationships

### Global Recipe Structure
```
global_recipes (recipe metadata)
  ├── global_recipe_ingredients (structured: ingredient_id, amount, unit)
  │     └── global_recipe_ingredients_detail (FK → global_recipe_ingredients.id)
  ├── global_recipe_steps
  └── global_recipe_tags
```

### User Recipe Structure  
```
user_recipes (recipe metadata, recipe_id → global_recipes)
  ├── user_recipe_ingredients (raw_name, amount, unit)
  │     └── user_recipe_ingredients_detail (FK → user_recipe_ingredients.id)
  ├── user_recipe_steps
  └── user_recipe_tags
```

## The Copy Process (Add to Cookbook)

Located in: `src/app/finder/page.tsx` line 524

### Step 1: Create User Recipe
```typescript
const { data: userRecipe } = await supabase
  .from('user_recipes')
  .insert({
    user_id: user.id,
    recipe_id: recipeId,  // ← Links to global recipe
    title: recipe.title,
    // ... other metadata
  })
```

### Step 2: Copy Ingredients & Map IDs
```typescript
// Get global ingredients WITH their IDs
const { data: globalIngredients } = await supabase
  .from('global_recipe_ingredients')
  .select('id, amount, unit, ingredients(name)')
  .eq('recipe_id', recipeId)

// Insert into user table and get NEW IDs
const { data: insertedIngredients } = await supabase
  .from('user_recipe_ingredients')
  .insert(
    globalIngredients.map(ing => ({
      user_recipe_id: userRecipe.user_recipe_id,
      raw_name: ing.ingredients.name,
      amount: ing.amount,
      unit: ing.unit
    }))
  )
  .select('id')  // ← Get back the new IDs!

// Create ID mapping
const ingredientIdMap = new Map()
globalIngredients.forEach((globalIng, index) => {
  ingredientIdMap.set(
    globalIng.id,                    // Global ID
    insertedIngredients[index].id    // New user ID
  )
})
```

### Step 3: Copy Detail Records with FK Remapped
```typescript
// Get global detail records
const { data: globalDetails } = await supabase
  .from('global_recipe_ingredients_detail')
  .select('*')
  .eq('recipe_id', recipeId)

// Remap FK and insert
const userDetails = globalDetails
  .filter(detail => detail.global_recipe_ingredient_id) // Only if FK exists
  .map(detail => ({
    user_recipe_id: userRecipe.user_recipe_id,
    user_recipe_ingredient_id: ingredientIdMap.get(detail.global_recipe_ingredient_id), // ← Remap!
    ingredient_id: detail.ingredient_id,
    original_text: detail.original_text,
    matched_term: detail.matched_term,
    match_type: detail.match_type,
    matched_alias: detail.matched_alias
  }))
  .filter(detail => detail.user_recipe_ingredient_id) // Only if mapping succeeded

await supabase
  .from('user_recipe_ingredients_detail')
  .insert(userDetails)
```

## Example: Adding "Viking Stew" to Cookbook

### Global Tables (Before)
**global_recipe_ingredients:**
| id  | recipe_id | amount | unit   | ingredient_id |
|-----|-----------|--------|--------|---------------|
| 801 | 99        | 4.5    | pounds | 42 (Pork)     |
| 802 | 99        | 2      | null   | 592 (Leeks)   |

**global_recipe_ingredients_detail:**
| id  | recipe_id | global_recipe_ingredient_id | ingredient_id | matched_term |
|-----|-----------|----------------------------|---------------|--------------|
| 501 | 99        | **801** ←                  | 42            | pork         |
| 502 | 99        | **802** ←                  | 592           | leeks        |

### User Tables (After Copy)
**user_recipe_ingredients:**
| id  | user_recipe_id | raw_name | amount | unit   |
|-----|----------------|----------|--------|--------|
| 201 | 1400           | pork     | 4.5    | pounds |
| 202 | 1400           | leeks    | 2      | null   |

**user_recipe_ingredients_detail:**
| detail_id | user_recipe_id | user_recipe_ingredient_id | ingredient_id | matched_term |
|-----------|----------------|---------------------------|---------------|--------------|
| 701       | 1400           | **201** ← (remapped!)     | 42            | pork         |
| 702       | 1400           | **202** ← (remapped!)     | 592           | leeks        |

### ID Mapping
```
Global ID 801 → User ID 201
Global ID 802 → User ID 202
```

## Shopping List Flow

**Only queries user tables:**
```sql
SELECT 
  uri.amount,
  uri.unit,
  ing.name,
  ing.category
FROM user_recipe_ingredients_detail detail
JOIN user_recipe_ingredients uri 
  ON detail.user_recipe_ingredient_id = uri.id  -- ← FK works!
JOIN ingredients ing 
  ON detail.ingredient_id = ing.ingredient_id
WHERE detail.user_recipe_id IN (...)
```

Result:
- Pork: 4.5 pounds
- Leeks: 2 count

## Why This Architecture?

✅ **Global recipes stay clean** - No per-user modifications
✅ **Users can customize** - Edit their copy without affecting others  
✅ **FK preserved** - Shopping list works immediately after adding  
✅ **Efficient** - Detail analysis done once (global), copied to users  
✅ **Scalable** - 1000 users can add same recipe, each gets proper FK  

## Files Changed

1. **add_fk_to_global_recipe_ingredients_detail.sql** - Adds FK to global detail table
2. **create_global_recipe_ingredients_detail_table.sql** - Updated schema
3. **src/app/finder/page.tsx** - Updated addToCookbook to copy detail records with FK
4. **src/app/shopping-list/page.tsx** - Reverted to only query user recipes

## Migration Steps

1. Run global FK migration:
```sql
-- In Supabase SQL Editor
\i add_fk_to_global_recipe_ingredients_detail.sql
```

2. Re-analyze global recipes to set FK (admin/moderator task)

3. Users can now add global recipes to cookbook with FK preserved

4. Shopping lists work immediately!

## Testing

1. **As Admin:** Analyze a global recipe (sets global FK)
2. **As User:** Add that global recipe to cookbook
3. **Verify:** Check user_recipe_ingredients_detail has FK set
4. **Test:** Generate shopping list, verify amounts show correctly

## Future: Bulk Re-analysis

For existing global recipes without FK, run:

```bash
node scripts/reanalyze-global-recipes.js
```

(TODO: Create this script similar to user recipe re-analysis)

