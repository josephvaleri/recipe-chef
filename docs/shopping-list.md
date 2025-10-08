# Shopping List Generator

The Shopping List Generator allows users to add recipes to calendar days and generate an aggregated, scaled shopping list for a date range and headcount, grouped by ingredient categories.

## Features

- **Meal Planning**: Add recipes to specific calendar dates with optional serving overrides
- **Smart Scaling**: Automatically scales ingredients based on people count vs recipe servings
- **Unit Normalization**: Converts units within the same family (mass↔mass, volume↔volume, count as-is)
- **Category Grouping**: Organizes ingredients by category for efficient shopping
- **Multiple Outputs**: Print, copy to clipboard, or push to Alexa
- **Fallback Support**: Works even without Alexa connection

## How It Works

### Scaling Logic

The system scales ingredients using the formula:
```
scaled_quantity = original_quantity × (people_count / recipe_servings) × unit_conversion_factor
```

- If `recipe.servings` is NULL or 0, defaults to 4 servings
- Only converts within the same unit family (mass→grams, volume→ml, count as-is)
- Does NOT convert between families (e.g., cups to grams) to avoid density assumptions

### Unit Families

- **Mass**: g, kg, oz, lb (normalized to grams)
- **Volume**: ml, l, tsp, tbsp, cup (normalized to ml)
- **Count**: count, each, piece (no conversion)

### Database Schema

#### Meal Planning
```sql
CREATE TABLE meal_plan_entries (
  entry_id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_date date NOT NULL,
  recipe_id bigint NOT NULL REFERENCES user_recipes(user_recipe_id),
  servings_override numeric,  -- optional per-entry override
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, plan_date, recipe_id)
);
```

#### Unit Dictionary
```sql
CREATE TABLE measurement_units (
  unit_code text PRIMARY KEY,
  family text CHECK (family IN ('mass','volume','count')),
  to_base_ratio numeric NOT NULL
);
```

## Usage

### 1. Adding Recipes to Calendar

1. Navigate to the calendar view
2. Click on a date to add recipes
3. Select recipes from your cookbook
4. Optionally override serving sizes
5. Save the meal plan

### 2. Generating Shopping Lists

1. Go to `/shopping-list`
2. Set your parameters:
   - **Start Date**: When to start the shopping list
   - **Days**: How many days to include
   - **People**: How many people you're cooking for
3. Click "Generate Shopping List"

### 3. Output Options

- **Print**: Opens a print-friendly page
- **Copy**: Copies plain text to clipboard
- **Alexa**: Pushes to your Alexa shopping list (requires connection)

## API Endpoints

### Generate Shopping List
```
GET /api/shopping-list/generate?start=YYYY-MM-DD&days=7&people=4
```

Returns grouped shopping list data:
```json
{
  "data": {
    "Produce": [
      {
        "ingredient_id": 1,
        "ingredient_name": "Tomatoes",
        "quantity": 2.5,
        "unit": "kg"
      }
    ]
  },
  "meta": {
    "start_date": "2024-12-06",
    "days": 7,
    "people": 4,
    "total_items": 15
  }
}
```

### Push to Alexa
```
POST /api/shopping-list/push-alexa
{
  "items": [
    {
      "ingredient_name": "Tomatoes",
      "quantity": 2.5,
      "unit": "kg"
    }
  ]
}
```

## Alexa Integration

### Setup

1. Create a Login with Amazon (LWA) application
2. Configure OAuth redirect URIs
3. Store client credentials in environment variables
4. Implement OAuth flow in settings page

### Edge Function

The `alexa_push_list` Edge Function handles:
- Token management and refresh
- List creation/retrieval
- Item addition to Alexa lists

### Fallback

If Alexa is not connected, the system:
- Copies plain text to clipboard
- Shows friendly error messages
- Provides manual sharing options

## Limitations

1. **No Cross-Family Conversions**: Won't convert cups to grams (density-dependent)
2. **Same Ingredient, Different Units**: Shows separate lines for mixed units
3. **Token Expiration**: Requires re-authentication when Alexa tokens expire
4. **List Size Limits**: Alexa has limits on list size (typically 1000 items)

## Testing

### Unit Tests
- RPC function correctness
- Unit conversion accuracy
- Scaling calculations

### Integration Tests
- API endpoint responses
- Database operations
- Error handling

### UI Tests
- Modal interactions
- Form validation
- Print functionality

## Troubleshooting

### Common Issues

1. **Empty Shopping List**
   - Check if recipes are added to calendar
   - Verify date range includes planned meals
   - Ensure recipes have ingredients

2. **Incorrect Quantities**
   - Verify serving sizes in recipes
   - Check unit conversions
   - Review scaling calculations

3. **Alexa Push Fails**
   - Check OAuth connection
   - Verify token expiration
   - Review Edge Function logs

### Debug Queries

```sql
-- Check meal plan entries
SELECT * FROM meal_plan_entries 
WHERE user_id = 'your-user-id' 
AND plan_date >= '2024-12-01';

-- Test shopping list generation
SELECT * FROM generate_shopping_list(
  'your-user-id'::uuid,
  '2024-12-06'::date,
  7,
  4
);
```

## Future Enhancements

1. **Smart Substitutions**: Suggest ingredient alternatives
2. **Store Layout**: Organize by store sections
3. **Price Estimation**: Add cost calculations
4. **Meal Prep**: Optimize for batch cooking
5. **Nutrition**: Include nutritional information
6. **Allergies**: Filter based on dietary restrictions
