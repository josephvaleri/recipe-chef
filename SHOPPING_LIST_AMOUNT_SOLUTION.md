# Shopping List Amount/Unit Integration Solution

## Problem
The shopping list needs to display quantities for each ingredient, but:
- `user_recipe_ingredients` has `amount`, `unit`, `raw_name`
- `user_recipe_ingredients_detail` has `ingredient_id`, `matched_term`
- There's **no link** between them to map amounts to the matched ingredients

## Solution Overview
Add a foreign key column `user_recipe_ingredient_id` to `user_recipe_ingredients_detail` table that references the specific ingredient row.

## Database Changes

### 1. Add Foreign Key Column
```sql
ALTER TABLE user_recipe_ingredients_detail 
ADD COLUMN user_recipe_ingredient_id BIGINT REFERENCES user_recipe_ingredients(id) ON DELETE CASCADE;
```

### 2. Update Existing Records
For existing records, we need to match them based on `user_recipe_id` and similarity between `original_text` and the constructed ingredient text:

```sql
UPDATE user_recipe_ingredients_detail detail
SET user_recipe_ingredient_id = ing.id
FROM user_recipe_ingredients ing
WHERE detail.user_recipe_id = ing.user_recipe_id
  AND detail.user_recipe_ingredient_id IS NULL
  AND (
    -- Try to match by raw_name similarity
    LOWER(TRIM(ing.raw_name)) = LOWER(TRIM(detail.matched_term))
    OR detail.original_text LIKE '%' || ing.raw_name || '%'
    OR ing.raw_name LIKE '%' || detail.matched_term || '%'
  );
```

### 3. Add Index
```sql
CREATE INDEX idx_user_recipe_ingredients_detail_ingredient_fk 
ON user_recipe_ingredients_detail(user_recipe_ingredient_id);
```

### 4. Update Application Code
When analyzing ingredients (`/api/ingredients/analyze`), ensure the `user_recipe_ingredient_id` is set when creating detail records.

## Updated Shopping List Query

### Before (Current)
```typescript
const { data: ingredients } = await supabase
  .from('user_recipe_ingredients_detail')
  .select(`
    matched_term,
    ingredients(ingredient_id, name, category_id)
  `)
  .eq('user_recipe_id', recipe_id);
  
// ❌ No amounts available!
```

### After (With FK)
```typescript
const { data: ingredients } = await supabase
  .from('user_recipe_ingredients_detail')
  .select(`
    matched_term,
    matched_alias,
    user_recipe_ingredients!inner(
      amount,
      unit,
      raw_name
    ),
    ingredients!inner(
      ingredient_id,
      name,
      category_id,
      ingredient_categories(name)
    )
  `)
  .eq('user_recipe_id', recipe_id);

// ✅ Now we have amounts, units, AND matched ingredients!
```

## Scaling Logic

With amounts available, the shopping list can now:

```typescript
allIngredients.forEach((ingredient: any) => {
  const servings = parseFloat(ingredient.servings) || 4;
  const scaleFactor = params.people / servings;
  
  // Parse the amount from user_recipe_ingredients
  const originalAmount = parseFloat(ingredient.user_recipe_ingredients.amount) || 0;
  const unit = ingredient.user_recipe_ingredients.unit || 'count';
  const ingredientName = ingredient.ingredients.name;
  const ingredientId = ingredient.ingredients.ingredient_id;
  
  // Scale the amount
  const scaledAmount = originalAmount * scaleFactor;
  
  const key = `${ingredientId}-${unit}`;
  
  if (ingredientMap.has(key)) {
    ingredientMap.get(key).quantity += scaledAmount;
  } else {
    ingredientMap.set(key, {
      ingredient_id: ingredientId,
      ingredient_name: ingredientName,
      quantity: scaledAmount,
      unit: unit,
      category_name: ingredient.ingredients.ingredient_categories.name
    });
  }
});
```

## Benefits

1. **Accurate Amounts**: Shopping list shows "2.5 cups" instead of "3 items"
2. **Proper Scaling**: Can scale based on servings (e.g., recipe for 4, cooking for 6)
3. **Unit Aggregation**: Can sum "1 cup" + "0.5 cup" = "1.5 cups"
4. **Better UX**: Users see meaningful quantities instead of counts

## Migration Steps

1. Run the SQL migration to add the FK column
2. Update existing records with best-match logic
3. Update the ingredient analysis API to set the FK when creating detail records
4. Update shopping list query to include amounts/units
5. Update shopping list aggregation logic to use real amounts

## Future Enhancements

1. **Unit Conversion**: Convert compatible units (e.g., tsp → tbsp → cups)
2. **Smart Aggregation**: Handle "1 lb" + "8 oz" = "1.5 lb"
3. **Fractional Display**: Show "1/2 cup" instead of "0.5 cup"
4. **Min Quantities**: Round up small amounts (e.g., "a pinch")

