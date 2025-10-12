# Shopping List Data Flow - With Amounts & Units

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECIPE IMPORT                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │      user_recipe_ingredients                      │
        │  ───────────────────────────────────────────────  │
        │  id (PK)              │  201                      │
        │  user_recipe_id       │  1303                     │
        │  amount               │  "4.5"                    │
        │  unit                 │  "pounds"                 │
        │  raw_name             │  "boneless pork shoulder" │
        └───────────────────────────────────────────────────┘
                                  │
                                  │ Ingredient Analysis
                                  │ (/api/ingredients/analyze)
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │   user_recipe_ingredients_detail                  │
        │  ───────────────────────────────────────────────  │
        │  detail_id (PK)               │  501              │
        │  user_recipe_id               │  1303             │
        │  user_recipe_ingredient_id ━━━┼━ 201 (FK!) ◄────┐│
        │  ingredient_id                │  42               ││
        │  original_text                │  "boneless po..."  ││
        │  matched_term                 │  "pork"           ││
        │  match_type                   │  "alias"          ││
        └───────────────────────────────────────────────────┘│
                                  │                          │
                                  │                          │
┌─────────────────────────────────────────────────────────────────────┐
│                         SHOPPING LIST GENERATION                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │  Shopping List Query (with FK join!)              │
        │  SELECT                                            │
        │    detail.matched_term,                           │
        │    ingredients.name,              ◄── Ingredient  │
        │    ingredients.category,                          │
        │    user_recipe_ingredients.amount ◄── Via FK!     │
        │    user_recipe_ingredients.unit   ◄── Via FK!     │
        │  FROM user_recipe_ingredients_detail detail       │
        │  JOIN user_recipe_ingredients                     │
        │    ON detail.user_recipe_ingredient_id = uri.id ◄─┘
        │  JOIN ingredients                                 │
        │    ON detail.ingredient_id = ingredients.id       │
        └───────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │  Scaling & Aggregation                            │
        │  ───────────────────────────────────────────────  │
        │  Recipe A: 2 cups flour (serves 4)                │
        │  Recipe B: 1 cup flour (serves 2)                 │
        │  Cooking for: 6 people                            │
        │                                                    │
        │  Scale A: 2 × (6/4) = 3 cups                      │
        │  Scale B: 1 × (6/2) = 3 cups                      │
        │  Total: 3 + 3 = 6 cups flour                      │
        └───────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │  Final Shopping List                              │
        │  ───────────────────────────────────────────────  │
        │  Produce:                                         │
        │    • Tomatoes: 2.5 lbs                            │
        │    • Onions: 3 cups                               │
        │                                                    │
        │  Grains:                                          │
        │    • Flour: 6 cups                                │
        │    • Rice: 500 g                                  │
        │                                                    │
        │  Proteins:                                        │
        │    • Pork: 9 lbs                                  │
        │    • Chicken: 2 lbs                               │
        └───────────────────────────────────────────────────┘
```

## Key Points

### 1. The Foreign Key (user_recipe_ingredient_id)
This is the **critical link** that enables amount/unit access:
- Links detail row → original ingredient row
- Preserves the parsed amount and unit
- Allows shopping list to access real quantities

### 2. Why Not Just Use raw_name Matching?
**Problem:** "2 cups diced tomatoes" vs "tomatoes" don't match
**Solution:** FK provides direct, reliable link

### 3. Query Structure
```typescript
// The magic query that gets everything
user_recipe_ingredients_detail
  .select(`
    user_recipe_ingredients!inner(amount, unit),  // Via FK
    ingredients!inner(name, category)              // Via ingredient_id
  `)
```

## Before vs After Comparison

### BEFORE (No FK Link)
```
user_recipe_ingredients          user_recipe_ingredients_detail
┌──────────────┐                 ┌──────────────┐
│ id: 201      │                 │ detail_id:501│
│ amount: 4.5  │  ❌ No Link!    │ ingredient_id│
│ unit: lbs    │ ←  ─  ─  ─  ─  │ matched_term │
│ raw_name:... │                 └──────────────┘
└──────────────┘
                                        ↓
                              Shopping List: "Pork: 1 count" ❌
```

### AFTER (With FK Link)
```
user_recipe_ingredients          user_recipe_ingredients_detail
┌──────────────┐                 ┌───────────────────┐
│ id: 201      │  ✅ FK Link!    │ detail_id: 501    │
│ amount: 4.5  │ ←═══════════════│ user_recipe...201 │
│ unit: lbs    │                 │ ingredient_id: 42 │
│ raw_name:... │                 │ matched_term:pork │
└──────────────┘                 └───────────────────┘
                                        ↓
                              Shopping List: "Pork: 4.5 lbs" ✅
```

## Example Trace

### Input: Viking Stew Recipe
```
Ingredients:
1. 4 1/2 pounds boneless pork shoulder roast
2. 3 teaspoons kosher salt
3. 1/4 cup honey
```

### Step 1: Import → user_recipe_ingredients
| id  | user_recipe_id | amount | unit      | raw_name                 |
|-----|----------------|--------|-----------|--------------------------|
| 201 | 1303           | 4.5    | pounds    | boneless pork shoulder   |
| 202 | 1303           | 3      | teaspoons | kosher salt              |
| 203 | 1303           | 0.25   | cup       | honey                    |

### Step 2: Analysis → user_recipe_ingredients_detail
| detail_id | user_recipe_id | user_recipe_ingredient_id | ingredient_id | matched_term |
|-----------|----------------|---------------------------|---------------|--------------|
| 501       | 1303           | **201**                   | 42            | pork         |
| 502       | 1303           | **202**                   | 158           | salt         |
| 503       | 1303           | **203**                   | 89            | honey        |

### Step 3: Add to Meal Plan
- User adds Viking Stew to Dec 15th
- Recipe serves 6, cooking for 8
- Scale factor: 8/6 = 1.333

### Step 4: Generate Shopping List
```sql
SELECT 
  ing.name,
  uri.amount,
  uri.unit
FROM user_recipe_ingredients_detail detail
JOIN user_recipe_ingredients uri 
  ON detail.user_recipe_ingredient_id = uri.id
JOIN ingredients ing 
  ON detail.ingredient_id = ing.ingredient_id
WHERE detail.user_recipe_id = 1303
```

**Results:**
| name  | amount | unit      |
|-------|--------|-----------|
| Pork  | 4.5    | pounds    |
| Salt  | 3      | teaspoons |
| Honey | 0.25   | cup       |

### Step 5: Scale & Display
```
Proteins:
  • Pork: 6 lbs (4.5 × 1.333)

Condiments:
  • Honey: 0.33 cup (0.25 × 1.333)

Spices:
  • Salt: 4 tsp (3 × 1.333)
```

## Aggregation Example

Two recipes both use tomatoes:

### Recipe A (Serves 4) → Cooking for 6
- Original: 2 cups
- Scaled: 2 × (6/4) = 3 cups

### Recipe B (Serves 2) → Cooking for 6  
- Original: 1 cup
- Scaled: 1 × (6/2) = 3 cups

### Shopping List
```
Produce:
  • Tomatoes: 6 cups (3 + 3)
```

Key: Same `ingredient_id` + same `unit` → Aggregate!

## Why This Architecture?

### ✅ Advantages
1. **Preserves Original Data:** Never loses the "4.5 pounds" 
2. **Clean Separation:** Parsing vs Matching vs Shopping
3. **Scalable:** Works with any number of recipes
4. **Flexible:** Can add unit conversion later
5. **Accurate:** Direct FK link, no fuzzy matching at query time

### ⚠️ Considerations
1. **Requires Analysis:** Recipes must be analyzed to get FK
2. **Migration Needed:** Existing data needs FK backfill
3. **One-to-One:** Each detail row links to ONE ingredient row
4. **Unit Variety:** "1 cup" + "2 tbsp" stay separate (future: convert)

## Next Steps: Unit Conversion

Future enhancement to aggregate compatible units:

```
Current:
  • Flour: 2 cups
  • Flour: 8 tbsp
  
After Unit Conversion:
  • Flour: 2.5 cups (2 cups + 8 tbsp = 2.5 cups)
```

Requires:
- Unit conversion table (tbsp → cup, g → kg, etc.)
- Unit family detection (volume vs mass)
- "Best unit" selection logic (use cups, not tbsp for large amounts)

