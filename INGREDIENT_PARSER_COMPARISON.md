# Ingredient Parser Comparison

## Two Different Parsers, Two Different Purposes

Your Recipe Chef app now has **two complementary ingredient parsers** that work together:

---

## 1. **Quantity Parser** (NEW) 📏
**File:** `src/lib/parseIngredient.ts`

### Purpose
Extracts **quantity information** (amount, unit, name) for **recipe scaling** and **shopping lists**.

### What It Does
- Parses: `"1 cup flour"` → `{ amount: "1", unit: "cup", name: "flour" }`
- Parses: `"2 tablespoons olive oil"` → `{ amount: "2", unit: "tablespoons", name: "olive oil" }`
- Parses: `"1/2 teaspoon salt"` → `{ amount: "1/2", unit: "teaspoon", name: "salt" }`

### Key Features
- ✅ Extracts **numeric amounts** (fractions, decimals, ranges)
- ✅ Identifies **50+ common units** (cups, tablespoons, grams, etc.)
- ✅ Handles **parenthetical units** `"1 (14 ounce) can"`
- ✅ Preserves **ingredient name** for display
- ❌ Does NOT match against database
- ❌ Does NOT identify specific ingredients

### Use Cases
- **Recipe Scaling**: Double or halve recipes
- **Shopping List Aggregation**: Combine "2 cups flour" + "1 cup flour" = "3 cups flour"
- **Nutritional Calculations**: Use amounts for calculations
- **Unit Conversion**: Convert cups to grams

### Database Fields Populated
- `user_recipe_ingredients.amount` = `"1"`
- `user_recipe_ingredients.unit` = `"cup"`
- `user_recipe_ingredients.raw_name` = `"flour"`
- `global_recipe_ingredients.amount` = `"1"`
- `global_recipe_ingredients.unit` = `"cup"`
- `global_recipe_ingredients.raw_name` = `"flour"`

### Used By
- URL Import (`/add`, `/admin/global-recipes/add`)
- Paprika Import (`/api/import-paprika`)
- Any future import method

---

## 2. **Ingredient Identifier** (EXISTING) 🔍
**File:** `src/app/api/ingredients/search/route.ts` → `parseIngredientText()`

### Purpose
**Identifies and matches** ingredient text to actual **ingredient_id** in the database for **ingredient tracking** and **recipe finder**.

### What It Does
- Parses: `"1 cup all-purpose flour"` → Finds `ingredient_id=123` (Flour)
- Parses: `"2 (14 oz) cans chicken broth"` → Finds `ingredient_id=456` (Chicken Broth)
- Parses: `"1/2 teaspoon kosher salt"` → Finds `ingredient_id=789` (Salt)

### Key Features
- ✅ **Matches against database** (`ingredients` table)
- ✅ Handles **two-word ingredients** (`"chicken broth"`, `"olive oil"`)
- ✅ **Singular/plural variations** (`"tomato"` vs `"tomatoes"`)
- ✅ **Removes preparation methods** (`"chopped"`, `"diced"`, `"sliced"`)
- ✅ **Category grouping** (groups by "Vegetables", "Proteins", etc.)
- ✅ **Fuzzy matching** with confidence scores
- ❌ Does NOT extract amounts/units for scaling

### Use Cases
- **Detailed Ingredient Analysis**: Match raw text to known ingredients
- **Recipe Finder**: "Find recipes with chicken, tomatoes, basil"
- **Ingredient Statistics**: Track most-used ingredients
- **Ingredient Categorization**: Group by category
- **Ingredient Aliases**: Match "cilantro" or "coriander" to same ingredient

### Database Fields Populated
- `user_recipe_ingredients.ingredient_id` = `123` (links to `ingredients` table)
- `global_recipe_ingredients.ingredient_id` = `456` (links to `ingredients` table)

### Used By
- **Detailed Ingredient Analysis** button on recipe pages
- `/api/ingredients/analyze` endpoint
- Recipe Finder search functionality

---

## How They Work Together 🤝

### Import Flow (URL or Paprika):

1. **Quantity Parser** runs FIRST:
   ```
   Input: "1 cup all-purpose flour"
   Output: { amount: "1", unit: "cup", name: "all-purpose flour" }
   ```
   → Saves to database: `amount="1"`, `unit="cup"`, `raw_name="all-purpose flour"`

2. **Ingredient Identifier** runs SECOND (when user clicks "Analyze"):
   ```
   Input: "all-purpose flour"
   Output: ingredient_id=123 (Flour)
   ```
   → Updates database: `ingredient_id=123`

### Final Database Record:
```sql
INSERT INTO user_recipe_ingredients (
  amount,          -- "1"           (from Quantity Parser)
  unit,            -- "cup"         (from Quantity Parser)
  raw_name,        -- "all-purpose flour"  (from Quantity Parser)
  ingredient_id    -- 123           (from Ingredient Identifier)
)
```

---

## Comparison Table

| Feature | Quantity Parser (NEW) | Ingredient Identifier (EXISTING) |
|---------|----------------------|----------------------------------|
| **File** | `/lib/parseIngredient.ts` | `/api/ingredients/search/route.ts` |
| **Purpose** | Extract amount/unit for scaling | Match to ingredient_id in database |
| **Input** | `"1 cup flour"` | `"1 cup flour"` |
| **Output** | `{ amount: "1", unit: "cup", name: "flour" }` | `ingredient_id=123` |
| **Database Lookup?** | ❌ No | ✅ Yes |
| **Handles Units?** | ✅ Yes (50+ units) | ❌ Removes them |
| **Extracts Amounts?** | ✅ Yes (1, 1/2, 1.5) | ❌ Removes them |
| **Singular/Plural?** | ❌ No | ✅ Yes |
| **Two-Word Ingredients?** | ❌ No | ✅ Yes |
| **Categories?** | ❌ No | ✅ Yes |
| **When Used?** | During import (URL/Paprika) | After import (Analysis) |
| **Speed** | ⚡ Fast (no DB lookups) | 🐌 Slower (many DB queries) |

---

## Key Differences

### Cleaning Approach

**Quantity Parser:**
```typescript
"1 cup all-purpose flour"
→ Extracts: amount="1", unit="cup", name="all-purpose flour"
→ Keeps: Full ingredient name for display
```

**Ingredient Identifier:**
```typescript
"1 cup all-purpose flour"
→ Removes: "1", "cup"
→ Removes: "all-purpose" (preparation/descriptor)
→ Searches DB for: "flour"
→ Returns: ingredient_id=123
```

### Database Interaction

**Quantity Parser:**
- ✅ Runs synchronously
- ✅ No database queries
- ✅ Pure text processing
- ✅ Works offline

**Ingredient Identifier:**
- ✅ Requires database connection
- ✅ Multiple queries per ingredient
- ✅ Checks `ingredients`, `two_word_ingredients`, `ingredient_aliases` tables
- ❌ Requires online connection

---

## When to Use Which Parser

### Use Quantity Parser When:
- ✅ Importing recipes (URL, Paprika, manual entry)
- ✅ Need to populate `amount` and `unit` fields
- ✅ Building shopping lists
- ✅ Implementing recipe scaling (2x, 0.5x)
- ✅ Need fast, offline-capable parsing

### Use Ingredient Identifier When:
- ✅ User clicks "Detailed Ingredient Analysis"
- ✅ Need to link `raw_name` to `ingredient_id`
- ✅ Building Recipe Finder search functionality
- ✅ Generating ingredient statistics
- ✅ Categorizing ingredients

---

## Example: Complete Import Flow

### Step 1: Import Recipe
```typescript
// Quantity Parser runs
Input: ["1 cup flour", "2 tablespoons olive oil", "1/2 teaspoon salt"]

Output: [
  { amount: "1", unit: "cup", name: "flour" },
  { amount: "2", unit: "tablespoons", name: "olive oil" },
  { amount: "1/2", unit: "teaspoon", name: "salt" }
]

// Save to database
INSERT INTO user_recipe_ingredients (amount, unit, raw_name) VALUES
  ('1', 'cup', 'flour'),
  ('2', 'tablespoons', 'olive oil'),
  ('1/2', 'teaspoon', 'salt');
```

### Step 2: User Clicks "Analyze Ingredients"
```typescript
// Ingredient Identifier runs
Input: ["flour", "olive oil", "salt"]

// Database lookups:
"flour" → ingredient_id=123
"olive oil" → ingredient_id=456
"salt" → ingredient_id=789

// Update database
UPDATE user_recipe_ingredients SET ingredient_id=123 WHERE raw_name='flour';
UPDATE user_recipe_ingredients SET ingredient_id=456 WHERE raw_name='olive oil';
UPDATE user_recipe_ingredients SET ingredient_id=789 WHERE raw_name='salt';
```

### Step 3: Recipe Scaling (2x)
```typescript
// Quantity Parser data used
Original: amount="1", unit="cup"
Scaled:   amount="2", unit="cup"
```

### Step 4: Recipe Finder
```typescript
// Ingredient Identifier data used
Find recipes containing ingredient_id=123 (flour)
```

---

## Summary

**These parsers are COMPLEMENTARY, not REDUNDANT!**

- **Quantity Parser** = "How much?" → Enables scaling
- **Ingredient Identifier** = "What is it?" → Enables search

Both are essential for a complete recipe management system! 🎉


