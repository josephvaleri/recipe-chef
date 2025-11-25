# Meal Type Auto-Matching Feature

## Overview
Recipes imported from URLs now automatically detect and set the meal type based on the recipe's category data.

## How It Works

### Data Sources
The system checks two fields from imported recipe data:
1. **`recipeCategory`** - Primary field (e.g., "Main Course", "Dessert", "Appetizer")
2. **`recipeCuisine`** - Secondary/fallback (sometimes contains meal type info)

### Matching Strategy (3 Levels)

#### Level 1: Exact Match
Direct match against `meal_types` table:
```
"Dessert" → Dessert
"Appetizer" → Appetizer
"Entrée" → Entrée
```

#### Level 2: Alias Match  
Match against `meal_type_aliases` table:
```
"Main Course" → Entrée (via alias)
"Starter" → Appetizer (via alias)
"Main Dish" → Entrée (via alias)
```

#### Level 3: Keyword Match
Partial string matching for common patterns:
```
"Main Course" → contains "main" → Entrée
"Chicken Soup Recipe" → contains "soup" → Soup
"Breakfast Burrito" → contains "breakfast" → Breakfast
```

### Keyword Map
```javascript
{
  'main': 'Entrée',
  'entree': 'Entrée',
  'entrée': 'Entrée',
  'course': 'Entrée',       // Catches "Main Course", "First Course", etc.
  'appetizer': 'Appetizer',
  'starter': 'Appetizer',
  'dessert': 'Dessert',
  'sweet': 'Dessert',
  'soup': 'Soup',
  'salad': 'Salad',
  'side': 'Side Dish',
  'breakfast': 'Breakfast',
  'brunch': 'Breakfast',
  'lunch': 'Lunch',
  'dinner': 'Dinner',
  'snack': 'Snack',
  'drink': 'Beverage',
  'cocktail': 'Beverage'
}
```

---

## Database Setup Required

### Step 1: Create Aliases Table
Run this SQL script:
```bash
cat add_meal_type_aliases.sql
# Then run against your Supabase database
```

This creates:
- `meal_type_aliases` table
- Common aliases like:
  - "Main Course" → Entrée
  - "Main Dish" → Entrée
  - "Starter" → Appetizer
  - "Starters" → Appetizer
  - etc.

### Step 2: Verify Table Exists
```sql
SELECT * FROM meal_type_aliases LIMIT 10;
```

---

## Examples

### Example 1: "Main Course"
```
Input: recipeCategory = "Main Course"
↓
Level 2: Check aliases
↓
Found: "main course" → Entrée
↓
Result: meal_type_id = 2 (Entrée)
```

### Example 2: "Dessert"
```
Input: recipeCategory = "Dessert"
↓
Level 1: Exact match
↓
Found: "Dessert" → Dessert
↓
Result: meal_type_id = 4 (Dessert)
```

### Example 3: "Chicken Soup Recipe"
```
Input: recipeCategory = "Chicken Soup Recipe"
↓
Level 1: No exact match
↓
Level 2: No alias match
↓
Level 3: Contains "soup"
↓
Found: "soup" → Soup
↓
Result: meal_type_id = 5 (Soup)
```

### Example 4: "Coarse" (Typo)
```
Input: recipeCategory = "Coarse"
↓
Contains "course"
↓
Level 3: Keyword match
↓
Found: "course" → Entrée
↓
Result: meal_type_id = 2 (Entrée)
```

---

## Implementation

### Files Modified
- `src/app/add/page.tsx` - Added `matchMealType()` function
- `src/app/admin/global-recipes/add/page.tsx` - Added `matchMealType()` function

### Function Location
Both files now have a `matchMealType()` function that:
1. Takes `recipeCategory` and `recipeCuisine` as parameters
2. Returns meal_type_id (or empty string if no match)
3. Logs matching process for debugging

### Integration Points

**User Recipe Import** (`/add` page):
```typescript
const mealTypeId = await matchMealType(recipe.recipeCategory, recipe.recipeCuisine)
// Save with meal_type_id
```

**Admin Global Recipe Import** (`/admin/global-recipes/add` page):
```typescript
const matchedMealTypeId = await matchMealType(importedData.recipeCategory, importedData.recipeCuisine)
// Populate form with matched ID
```

---

## Console Logging

When importing, check browser console for:

### Successful Match
```
Matching meal type for: main course
Found meal type via alias: 2
Imported recipe data: {
  ...
  recipeCategory: "Main Course",
  matchedMealTypeId: "2"
}
```

### No Match
```
Matching meal type for: unknown category
No meal type match found for: unknown category
Imported recipe data: {
  ...
  recipeCategory: "unknown category",
  matchedMealTypeId: ""
}
```

---

## Adding New Aliases

To add more aliases, run SQL:

```sql
-- Get the meal type ID first
SELECT meal_type_id, name FROM meal_types;

-- Add alias (example: "Main" → Entrée)
INSERT INTO meal_type_aliases (meal_type_id, alias)
VALUES (2, 'main')
ON CONFLICT (alias) DO NOTHING;
```

Or edit the `add_meal_type_aliases.sql` script and re-run it.

---

## Common Aliases Included

### Entrée (Main Course)
- main course
- main dish
- main
- entree
- entrée
- main courses
- dinner main

### Appetizer
- starter
- starters
- appetizers
- hors d'oeuvre
- finger food

### Side Dish
- side
- sides
- accompaniment
- side dishes

### Dessert
- desserts
- sweet
- sweets
- pastry
- baked goods

### Soup
- soups
- stew
- stews
- chowder
- bisque

### Salad
- salads
- greens

### Beverage
- drink
- drinks
- beverages
- cocktail
- cocktails
- smoothie

---

## Prep/Cook Time Debugging

### Issue
Prep time and cook time values might not be saving properly.

### Debug Steps

**1. Check Console Logs**
When importing, look for:
```
Imported recipe data: {
  prepTime: "15m",  ← Should have a value
  cookTime: "45m",  ← Should have a value
  ...
}
```

**2. If Values Are Empty**
The recipe source might not have time data, or it's in a format we don't recognize.

**3. Check Database After Save**
```sql
SELECT user_recipe_id, title, prep_time, cook_time
FROM user_recipes
ORDER BY created_at DESC
LIMIT 5;
```

Look for the most recent recipe and check if times are there.

### Common Issues

**Issue:** Times show in console but not in database
- **Check:** Database column type (should be TEXT)
- **Fix:** Ensure no validation is rejecting the format

**Issue:** Times are in PT format in database
- **Check:** Normalization didn't run
- **Fix:** Check `normalizeDuration()` function in `src/lib/jsonld.ts`

**Issue:** Times are blank in console
- **Check:** Source recipe doesn't have time data
- **Fix:** Add manually on edit page

---

## Testing

### Test Meal Type Matching

**Test 1: "Main Course"**
```
1. Import recipe with category: "Main Course"
2. Check console: Should log "Found meal type via alias: 2"
3. Check edit page: Meal Type should be "Entrée"
```

**Test 2: "Dessert"**
```
1. Import recipe with category: "Dessert"
2. Check console: Should log "Found exact meal type match: 4"
3. Check edit page: Meal Type should be "Dessert"
```

**Test 3: "Coarse" (Typo)**
```
1. Import recipe with category: "Coarse"
2. Check console: Should log "Found meal type via keyword 'course': 2"
3. Check edit page: Meal Type should be "Entrée"
```

### Test Time Values

**After importing, check:**
```
1. Browser console for: prepTime, cookTime values
2. Edit page fields show: "15m", "45m" (or whatever values)
3. Database has the values saved
```

If times don't appear, share the console log output!

---

## Files Modified
- `src/app/add/page.tsx` - Added meal type matching
- `src/app/admin/global-recipes/add/page.tsx` - Added meal type matching
- `add_meal_type_aliases.sql` - Database setup script

## Next Steps
1. Run `add_meal_type_aliases.sql` to create the aliases table
2. Test importing a recipe
3. Check console logs for matching details
4. Verify meal type is set correctly









