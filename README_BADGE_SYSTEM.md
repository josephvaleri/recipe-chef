# Recipe Chef Badge System 🏆

## Overview

A complete achievement/badge system for Recipe Chef with progressive tiers, anti-gaming protection, and real-time awards.

## Quick Start (5 Minutes)

### 1. Run Database Migrations

In Supabase SQL Editor, run each file in order:

```sql
-- migrations/001_create_badge_system_core.sql
-- migrations/002_create_valid_recipe_added_view.sql
-- migrations/003_create_badge_catalog_tables.sql
-- migrations/004_seed_badges_and_tiers.sql
-- migrations/005_create_badge_functions.sql
-- migrations/006_create_badge_rpcs.sql
-- migrations/007_enable_rls_and_grants.sql
```

Or run `migrations/RUN_ALL_BADGE_MIGRATIONS.sql` for the core setup.

### 2. Verify Installation

```sql
-- Check badges are seeded
SELECT COUNT(*) FROM public.badges; -- Should return 16

-- Test event logging (replace YOUR_USER_ID)
SELECT public.log_event_and_award(
  'recipe_added'::public.user_event_type,
  NULL,
  NULL,
  '{"name": "Test Recipe", "has_ingredients": true, "instructions_len": 200, "has_photo": false, "source_url": "", "imported": false}'::jsonb
);

-- Check your badges
SELECT * FROM public.user_badges WHERE user_id = auth.uid();
```

### 3. View Badges

Navigate to `/badges` in your app (link added to navigation menu).

---

## Features

✅ **16 Badges** with progressive tiers (Bronze → Diamond)  
✅ **Anti-gaming protection** (5-min cooldown, quality checks)  
✅ **Real-time awards** via `log_event_and_award()` RPC  
✅ **Toast notifications** for new badge awards  
✅ **Progress tracking** toward next tiers  
✅ **Retroactive awarding** via nightly scheduler  
✅ **Secure** (RLS enabled, SECURITY DEFINER RPCs)  
✅ **Type-safe** client utilities  

---

## Available Badges

| Badge | Tiers | Description |
|-------|-------|-------------|
| Recipe Maker | 25/50/100/250 | Add recipes to cookbook |
| Cuisine Explorer | 3/5/7/10 | Cook different cuisines |
| Curator | 5/10/25/50/100 | Build recipe collection |
| Top Rated Chef | 3/10/25 | Maintain highly rated recipes (≥4.5★) |
| Recipe Judge | 10/30/100 | Leave thoughtful reviews (≥20 chars) |
| Original Creator | 5/20/50 | Add non-imported recipes |
| Crowd Favorite | 25/100/500 | Recipes added by others |
| Monthly Meal Master | 5/10/15 | Plan meals on calendar (per month) |
| Regional Specialist | 10/25/50 | Master a single cuisine |
| Ingredient Adventurer | 50/100/200 | Cook with diverse ingredients |
| List Legend | 5/20/50 | Generate shopping lists |
| Alexa Ally | 3/10/25 | Push recipes to Alexa |
| Bug Hunter | 1/3/10 | Report confirmed bugs |
| Chef Tony Apprentice | 10/30/100 | Ask meaningful AI questions |
| Conversion Wizard | 10/30/100 | Use unit conversions |
| Holiday Baker | 3 | Bake holiday desserts in December |

---

## Integration

### Step 1: Add Toast Provider

Wrap your app in `src/app/layout.tsx`:

```typescript
import { BadgeToastProvider } from '@/components/badges/BadgeToast';

export default function RootLayout({ children }) {
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

### Step 2: Log Events

```typescript
import { logEventAndAward } from '@/lib/badges';
import { useBadgeToast } from '@/components/badges/BadgeToast';

function MyComponent() {
  const { showBadgeAwards } = useBadgeToast();
  
  const handleAction = async () => {
    // After successful action (e.g., recipe creation)
    const result = await logEventAndAward('recipe_added', {
      name: recipe.title,
      has_ingredients: ingredients.length > 0,
      instructions_len: instructions.join('').length,
      has_photo: !!recipe.image,
      source_url: recipe.source || '',
      imported: false
    }, recipeId);
    
    // Show toast if badges awarded
    if (result?.awards?.length > 0) {
      showBadgeAwards(result.awards);
    }
  };
}
```

### Step 3: Wire Events Throughout App

See **BADGE_EVENT_INTEGRATION_GUIDE.md** for specific integration points:

- Recipe added (manual + import)
- Calendar added
- Shopping list generated  
- Rating left
- AI queries
- And more...

---

## Event Types

```typescript
'recipe_added'              // User adds recipe
'recipe_cooked'             // User cooks recipe
'rating_left'               // User rates recipe
'calendar_added'            // User adds to calendar
'shopping_list_generated'   // User generates shopping list
'alexa_pushed'              // User pushes to Alexa
'ai_query'                  // User asks AI question
'unit_conversion_used'      // User converts units
'recipe_added_to_other_user' // Recipe added by another user
'recipe_accepted_global'     // Recipe accepted to global cookbook
'bug_report_confirmed'       // Bug report confirmed by admin
```

---

## Scheduler (Nightly Awards)

### Option 1: pg_cron (Recommended for Supabase Pro)

```sql
SELECT cron.schedule(
  'badge-award-nightly',
  '0 3 * * *',
  $$SELECT public.award_badges_for_all_users();$$
);
```

### Option 2: Supabase Edge Function

See **BADGE_SCHEDULER_SETUP.md** for complete setup.

---

## File Structure

```
recipe-chef/
├── migrations/
│   ├── 001_create_badge_system_core.sql      # Core tables & enum
│   ├── 002_create_valid_recipe_added_view.sql # Anti-gaming
│   ├── 003_create_badge_catalog_tables.sql   # Badge catalog
│   ├── 004_seed_badges_and_tiers.sql         # Badge data
│   ├── 005_create_badge_functions.sql        # Award logic
│   ├── 006_create_badge_rpcs.sql             # Client RPCs
│   └── 007_enable_rls_and_grants.sql         # Security
│
├── src/
│   ├── lib/
│   │   └── badges.ts                         # Client utilities
│   ├── components/badges/
│   │   ├── BadgeToast.tsx                    # Toast notifications
│   │   └── BadgeCard.tsx                     # Badge display
│   └── app/badges/
│       └── page.tsx                          # Badges page
│
├── BADGE_EVENT_INTEGRATION_GUIDE.md          # Integration guide
├── BADGE_SCHEDULER_SETUP.md                  # Scheduler setup
├── BADGE_SYSTEM_IMPLEMENTATION_SUMMARY.md    # Complete summary
└── README_BADGE_SYSTEM.md                    # This file
```

---

## API Reference

### Client Functions

```typescript
// Log event and award badges
logEventAndAward(type, meta, recipeId?, otherUserId?)

// Log event only (lighter)
logEvent(type, meta, recipeId?, otherUserId?)

// Query badges
getBadges()                 // All available badges
getBadgeTiers()             // All tiers
getUserBadges(userId?)      // User's earned badges
getBadgeProgress(userId?)   // Current progress counts

// Manual award (for backfilling)
awardBadgesForUser(userId?)
```

### Database RPCs

```sql
-- Log event + award (auto uses auth.uid())
SELECT public.log_event_and_award(type, recipe_id, other_user_id, meta);

-- Award badges for user
SELECT public.award_badges_for_user(user_id);

-- Award badges for all users (nightly job)
SELECT public.award_badges_for_all_users();

-- Get progress
SELECT public.get_badge_progress(user_id);
```

---

## Testing

### Test Event Logging

```javascript
// In browser console
const { logEventAndAward } = await import('/src/lib/badges');
const result = await logEventAndAward('recipe_added', {
  name: 'Test',
  has_ingredients: true,
  instructions_len: 200,
  has_photo: true,
  source_url: '',
  imported: false
});
console.log(result);
```

### Test in SQL Editor

```sql
-- View events
SELECT * FROM public.user_events 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- View badges
SELECT * FROM public.user_badges 
WHERE user_id = 'YOUR_USER_ID';

-- Manual award
SELECT * FROM public.award_badges_for_user('YOUR_USER_ID');
```

---

## Anti-Gaming

The system prevents badge exploitation:

✅ **5-minute cooldown** between recipe additions  
✅ **Quality checks**: Must have name, ingredients, and one of:
  - Photo
  - Source URL
  - 150+ character instructions

✅ **Event validation**: Enum types prevent invalid events  
✅ **RLS policies**: Users can only log own events  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not logging | Check `auth.uid()` is valid, verify RLS policies |
| Badges not awarding | Run `award_badges_for_user()` manually, check tier thresholds |
| Toast not showing | Ensure `BadgeToastProvider` wraps app, component is client-side |
| Scheduler not running | Check cron job setup, test function manually |

See **BADGE_EVENT_INTEGRATION_GUIDE.md** for detailed troubleshooting.

---

## Documentation

- **BADGE_EVENT_INTEGRATION_GUIDE.md** - Where and how to wire events
- **BADGE_SCHEDULER_SETUP.md** - Nightly scheduler setup options
- **BADGE_SYSTEM_IMPLEMENTATION_SUMMARY.md** - Complete implementation details
- **feature-badges-implementation.md** - Original specification

---

## Support

1. Check troubleshooting sections
2. Test functions in SQL Editor
3. Review migration files for syntax
4. Check Supabase logs for errors

---

## Next Steps

1. ✅ Run migrations
2. ✅ Add toast provider to layout
3. 🔄 Wire event logging (2-4 hours)
4. 🔄 Set up nightly scheduler
5. 🎉 Launch and celebrate badges!

---

**Built with ❤️ for Recipe Chef**  
16 badges • Progressive tiers • Real-time awards • Anti-gaming • Secure

