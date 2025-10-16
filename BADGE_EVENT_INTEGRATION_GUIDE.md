# Badge Event Logging Integration Guide

This guide shows exactly where and how to wire event logging throughout the Recipe Chef app to track user actions for the badge system.

## Quick Start

```typescript
import { logEventAndAward } from '@/lib/badges';
import { useBadgeToast } from '@/components/badges/BadgeToast';

// In your component:
const { showBadgeAwards } = useBadgeToast();

// After a user action:
const result = await logEventAndAward('recipe_added', {
  name: recipe.title,
  has_ingredients: ingredients.length > 0,
  instructions_len: instructions.join('\n').length,
  has_photo: !!recipe.image_url,
  source_url: recipe.source_url || '',
  imported: true
});

if (result?.awards && result.awards.length > 0) {
  showBadgeAwards(result.awards);
}
```

---

## 1. Recipe Added Events

### Location: `/src/app/add/page.tsx`
**When**: After successfully saving recipe from URL import
**Line**: After line 283 (after ingredient analysis)

```typescript
// Add after successful recipe save (around line 283)
import { logEventAndAward } from '@/lib/badges';

// After ingredients and instructions are saved:
try {
  const eventResult = await logEventAndAward('recipe_added', {
    name: recipe.name || 'Untitled Recipe',
    has_ingredients: recipe.recipeIngredient?.length > 0,
    instructions_len: Array.isArray(recipe.recipeInstructions) 
      ? recipe.recipeInstructions.join(' ').length 
      : String(recipe.recipeInstructions || '').length,
    has_photo: !!recipe.image,
    source_url: recipe.url || '',
    imported: true // This is an imported recipe
  }, savedRecipe.user_recipe_id);
  
  console.log('Badge event logged:', eventResult);
} catch (error) {
  console.error('Error logging badge event:', error);
  // Don't fail recipe save if event logging fails
}
```

### Location: `/src/app/add/manual/page.tsx`
**When**: After successfully creating manual recipe
**Line**: After line 218 (after successful saves)

```typescript
// Add after all recipe data is saved (around line 218)
import { logEventAndAward } from '@/lib/badges';

try {
  await logEventAndAward('recipe_added', {
    name: recipe.title,
    has_ingredients: ingredients.length > 0,
    instructions_len: instructions.map(i => i.text).join(' ').length,
    has_photo: !!recipe.imageUrl,
    source_url: '',
    imported: false // Original recipe!
  }, recipeData.user_recipe_id);
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 2. Calendar Added Events

### Location: `/src/app/calendar/page.tsx`
**When**: After successfully adding recipe to calendar
**Line**: After successful meal_plan insert (around line 350-400 in the add recipe handler)

```typescript
// Add after successful calendar insert
import { logEventAndAward } from '@/lib/badges';

try {
  await logEventAndAward('calendar_added', {
    date: selectedDate,
    recipe_type: recipe.recipe_scope // 'user' or 'global'
  });
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 3. Shopping List Generated Events

### Location: `/src/app/shopping-list/page.tsx`
**When**: After successfully generating shopping list
**Line**: After shopping list data is loaded (in generateShoppingList or similar function)

```typescript
// Add after shopping list is generated
import { logEventAndAward } from '@/lib/badges';

try {
  await logEventAndAward('shopping_list_generated', {
    from_date: fromDate,
    to_date: toDate,
    recipe_count: mealPlanData.length,
    item_count: Object.values(groupedItems).flat().length
  });
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 4. Rating/Review Events

### Location: Where ratings are submitted (likely in recipe detail pages)
**When**: After successfully submitting a rating
**Files**: `/src/app/recipe/[id]/page.tsx` or `/src/app/global-recipe/[id]/page.tsx`

```typescript
// Add after rating submission
import { logEventAndAward } from '@/lib/badges';

try {
  await logEventAndAward('rating_left', {
    review_len: reviewText?.length || 0,
    rating: score
  }, recipeId);
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 5. Recipe Cooked Events

### Location: If you have a "cooking mode" or "mark as cooked" feature
**When**: When user marks a recipe as cooked or completes cooking

```typescript
// When recipe is marked as cooked
import { logEventAndAward } from '@/lib/badges';

try {
  // Fetch ingredient IDs from the recipe
  const { data: recipeData } = await supabase
    .from('user_recipes')
    .select(`
      cuisine_id,
      cuisines(name),
      user_recipe_ingredients_detail(ingredient_id)
    `)
    .eq('user_recipe_id', recipeId)
    .single();

  const ingredientIds = recipeData?.user_recipe_ingredients_detail?.map(
    (detail: any) => detail.ingredient_id
  ) || [];

  await logEventAndAward('recipe_cooked', {
    cuisine: recipeData?.cuisines?.name || '',
    ingredient_ids: ingredientIds,
    tags: recipeTags || [],
    category: recipeCategory || ''
  }, recipeId);
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 6. AI Query Events

### Location: Where AI/Chef Tony queries are made
**Files**: Likely in AI search or chat features

```typescript
// When user submits an AI query
import { logEventAndAward } from '@/lib/badges';

try {
  await logEventAndAward('ai_query', {
    question_len: query.length,
    meaningful: query.length >= 20 // Consider meaningful if >= 20 chars
  });
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 7. Unit Conversion Events

### Location: Where unit conversions happen (if there's a conversion tool)
**When**: When user uses unit conversion feature

```typescript
// When user converts units
import { logEventAndAward } from '@/lib/badges';

try {
  await logEventAndAward('unit_conversion_used', {
    from_unit: fromUnit,
    to_unit: toUnit,
    amount: amount
  });
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 8. Recipe Added to Other User's Cookbook

### Location: Recipe Finder or where users can copy recipes from global cookbook
**When**: User adds a global recipe to their cookbook

```typescript
// When copying/adding someone else's recipe
import { logEventAndAward } from '@/lib/badges';

try {
  // Log for the current user (who is adding the recipe)
  await logEventAndAward('calendar_added', { /* ... */ });
  
  // ALSO log that the original owner's recipe was added by another user
  if (originalOwnerId) {
    await supabase.rpc('admin_log_event_and_award', {
      p_user_id: originalOwnerId,
      p_type: 'recipe_added_to_other_user',
      p_meta: {
        original_owner_id: originalOwnerId,
        added_by: currentUserId,
        recipe_title: recipeName
      }
    });
  }
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 9. Global Recipe Acceptance (Moderator)

### Location: `/src/app/moderator/page.tsx`
**When**: Moderator approves a recipe for global cookbook

```typescript
// When moderator approves a recipe
import { logEventAndAward } from '@/lib/badges';

try {
  // Log event for the recipe submitter
  await supabase.rpc('admin_log_event_and_award', {
    p_user_id: submittedBy,
    p_type: 'recipe_accepted_global',
    p_meta: {
      recipe_title: recipeName,
      approved_by: moderatorId
    }
  });
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## 10. Bug Report Confirmed (Admin)

### Location: Admin panel or bug tracking system
**When**: Admin confirms a user-reported bug

```typescript
// When admin confirms a bug report
import { supabase } from '@/lib/supabase';

try {
  await supabase.rpc('admin_log_event_and_award', {
    p_user_id: reporterId,
    p_type: 'bug_report_confirmed',
    p_meta: {
      bug_id: bugId,
      bug_description: description
    }
  });
} catch (error) {
  console.error('Error logging badge event:', error);
}
```

---

## Adding Toast Notifications

### Wrap your app with the BadgeToastProvider

**Location**: `/src/app/layout.tsx` or main layout file

```typescript
import { BadgeToastProvider } from '@/components/badges/BadgeToast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <BadgeToastProvider>
          {children}
        </BadgeToastProvider>
      </body>
    </html>
  );
}
```

### Use the toast in components

```typescript
'use client';

import { useBadgeToast } from '@/components/badges/BadgeToast';
import { logEventAndAward } from '@/lib/badges';

export function MyComponent() {
  const { showBadgeAwards } = useBadgeToast();
  
  const handleAction = async () => {
    const result = await logEventAndAward('recipe_added', { /* meta */ });
    
    if (result?.awards && result.awards.length > 0) {
      showBadgeAwards(result.awards);
    }
  };
  
  return <button onClick={handleAction}>Add Recipe</button>;
}
```

---

## Testing Event Logging

### Manual Testing in Browser Console

```javascript
// Test logging an event
const { logEventAndAward } = await import('/src/lib/badges');

const result = await logEventAndAward('recipe_added', {
  name: 'Test Recipe',
  has_ingredients: true,
  instructions_len: 200,
  has_photo: true,
  source_url: 'https://example.com',
  imported: false
});

console.log('Result:', result);
```

### Testing in Supabase SQL Editor

```sql
-- Check events logged
SELECT * FROM public.user_events 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- Check earned badges
SELECT * FROM public.user_badges 
WHERE user_id = 'YOUR_USER_ID';

-- Check badge progress
SELECT * FROM public.get_badge_progress('YOUR_USER_ID');

-- Manually trigger badge award
SELECT * FROM public.award_badges_for_user('YOUR_USER_ID');
```

---

## Priority Integration Order

1. **HIGH PRIORITY** (implement first):
   - Recipe Added (manual + import)
   - Calendar Added
   - Shopping List Generated

2. **MEDIUM PRIORITY**:
   - Rating Left
   - Recipe Cooked (if feature exists)
   - AI Query

3. **LOW PRIORITY** (implement when features exist):
   - Unit Conversion
   - Alexa Push
   - Bug Report Confirmed
   - Global Recipe Acceptance

---

## Important Notes

1. **Anti-Gaming**: The `valid_recipe_added_events` view automatically filters recipe_added events with 5-minute cooldown and quality checks.

2. **Non-Blocking**: Always wrap event logging in try-catch to prevent failures from affecting user experience.

3. **Metadata Consistency**: Ensure meta fields match the spec:
   - `recipe_added`: name, has_ingredients, instructions_len, has_photo, source_url, imported
   - `recipe_cooked`: cuisine, ingredient_ids, tags, category
   - `rating_left`: review_len
   - `ai_query`: question_len OR meaningful

4. **Performance**: `logEvent()` is lighter than `logEventAndAward()`. Use `logEvent()` for high-frequency actions and run `award_badges_for_user()` on a schedule.

---

## Troubleshooting

### Events not logging
- Check authentication: `auth.uid()` must be valid
- Check RLS policies are enabled
- Verify enum values match exactly

### Badges not awarding
- Run `SELECT * FROM award_badges_for_user(auth.uid());` manually
- Check `profiles.badges` JSON is updating
- Verify badge tier thresholds

### Toast not showing
- Ensure `BadgeToastProvider` wraps your app
- Check `result.awards` is not empty
- Verify component is client-side (`'use client'`)

---

## Next Steps

1. Run database migrations (001-007)
2. Add BadgeToastProvider to layout
3. Integrate event logging in recipe creation flows
4. Add Badges page link to navigation ✅ (Already done!)
5. Test with real user actions
6. Schedule nightly `award_badges_for_all_users()` job

For questions or issues, refer to `/feature-badges-implementation.md` for full specification.


