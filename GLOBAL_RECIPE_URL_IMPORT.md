# Global Recipe URL Import - Admin Feature

## Overview
Admins can now import recipes directly to the Global Cookbook from URLs, just like the personal cookbook import feature.

## How to Use

### Step 1: Navigate to Add Global Recipe Page
Go to: **Admin Dashboard → Global Recipes → Add Global Recipe**
Or directly to: `/admin/global-recipes/add`

### Step 2: Import from URL
1. **Find the URL Import section** at the top of the page (blue/orange card)
2. **Paste a recipe URL** from any major recipe website:
   - AllRecipes.com
   - Food Network
   - NYTimes Cooking
   - Bon Appétit
   - Serious Eats
   - Any site with structured recipe data
3. **Click "Import"**

### Step 3: Review Auto-Populated Form
The form will automatically fill with:
- ✅ **Title** - Recipe name
- ✅ **Description** - Recipe description
- ✅ **Prep Time** - Converted to readable format (e.g., "15m")
- ✅ **Cook Time** - Converted to readable format (e.g., "45m")
- ✅ **Total Time** - Converted to readable format (e.g., "1h")
- ✅ **Servings** - Number of servings
- ✅ **Image URL** - Recipe image (extracted from ImageObject)
- ✅ **Source Name** - Author or website name
- ✅ **Source URL** - Original recipe URL
- ✅ **Steps** - All cooking instructions

### Step 4: Complete Missing Details
Manually select/add:
- **Cuisine** - Select from dropdown
- **Meal Type** - Select from dropdown
- **Difficulty** - Adjust if needed (defaults to "Easy")

### Step 5: Save to Global Cookbook
1. **Review all fields**
2. **Click "Save Recipe"**
3. **Redirects to Global Recipe Edit Page**
4. **Run "Detailed Ingredient Analysis"** to match ingredients

---

## How Ingredients Are Handled

### Imported Ingredients
When a recipe is imported from URL:
- **Ingredients are saved with `raw_name` field**
- Example: `"2 cups all-purpose flour"`
- Stored as-is in the database
- Ready for automatic matching

### Ingredient Analysis
After saving, on the Global Recipe page:
1. Navigate to the saved recipe
2. Click **"Run Detailed Ingredient Analysis"**
3. The system will automatically:
   - Parse each ingredient text
   - Match to ingredients in the database
   - Handle preparation methods, quantities, etc.
   - Save matched results to `global_recipe_ingredients_detail`

### Manual Ingredients
For manual entry (without URL import):
- Use the dropdown to select ingredients
- Enter amount and unit manually
- These bypass the analysis step

---

## Recipe Parsing Order

The import uses the following priority:

1. **JSON-LD** (schema.org/Recipe) - Highest quality ✅
2. **Microdata** (itemtype) - High quality ✅
3. **RDFa** (property/vocab) - Medium quality ✅
4. **h-recipe** (Microformats) - Medium quality ✅
5. **Heuristic HTML** - Lowest quality (fallback) ✅

## Data Normalization

All Schema.org complex objects are normalized:

| Object Type | Normalized To |
|-------------|---------------|
| `ImageObject` | URL string |
| `Person/Organization` | Name string |
| `HowToStep` | Text string |
| `HowToSection` | Flattened steps |
| `NutritionInformation` | Simple values |
| `AggregateRating` | Numeric values |
| ISO 8601 Duration (PT15M) | Readable format (15m) |

---

## Features

### ✅ What's Included
- Full recipe data extraction
- Automatic field population
- Clean, normalized values
- All ingredients as raw text
- All cooking steps
- Source attribution

### ⚠️ Manual Review Required
- **Cuisine selection** - Not auto-detected
- **Meal type selection** - Not auto-detected  
- **Difficulty level** - Defaults to "Easy", adjust as needed
- **Ingredient analysis** - Run manually after save

### 🔒 Security
- **Admin-only access** - Checked at page load
- **Session validation** - All API calls authenticated
- **Database permissions** - RLS policies enforced

---

## Workflow Comparison

### User Cookbook Import
```
/add → Enter URL → Import → Save → /recipe/{id}/edit
```
**Saves to:** `user_recipes` table
**Visibility:** Only the user

### Global Cookbook Import (Admin)
```
/admin/global-recipes/add → Enter URL → Import → Review → Save → /global-recipe/{id}/edit
```
**Saves to:** `global_recipes` table
**Visibility:** All users
**Requires:** Admin role

---

## Example Usage

### 1. Import AllRecipes Cookie Recipe
**URL:** `https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/`

**Auto-filled:**
- Title: "Best Chocolate Chip Cookies"
- Description: "These cookies are the pinnacle..."
- Prep: "15m"
- Cook: "10m"  
- Total: "25m"
- Servings: "4 dozen"
- Steps: 6 steps auto-populated
- Ingredients: 11 ingredients ready for analysis

**Manual selection:**
- Cuisine: American
- Meal Type: Dessert
- Difficulty: Easy

**Then:** Click Save → Redirects to edit page → Run ingredient analysis

---

## Troubleshooting

### Import Fails with 401 Error
- **Cause:** Session expired
- **Fix:** Sign out and sign back in

### Import Returns "No recipe found"
- **Cause:** Website doesn't have structured recipe data
- **Fix:** Try a different source or enter manually

### Servings Field is Blank
- **Cause:** RecipeYield format not recognized
- **Fix:** Check browser console for debug logs, manually enter servings

### Image Shows JSON Object
- **Cause:** Parsing error (should be fixed now)
- **Fix:** Copy just the URL from the object and paste into Image URL field

### Steps Not Appearing
- **Cause:** Instructions in unexpected format
- **Fix:** Manually enter steps using the "Add" button

---

## Files Modified
- `src/app/admin/global-recipes/add/page.tsx` - Added URL import
- `src/lib/jsonld.ts` - Enhanced normalization
- `src/app/api/import-recipe/route.ts` - Fixed authentication

## Documentation
- `JSONLD_NORMALIZATION_FIX.md` - Details on Schema.org object parsing
- `SESSION_SUMMARY.md` - Complete session overview









