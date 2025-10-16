# 🏆 Start Here: Badge System Implementation

## Welcome! Your Badge System is Ready 🎉

Everything has been implemented and is ready to deploy. This guide will get you started in **5 minutes**.

---

## 📁 What Was Created

### Database (7 Migrations)
```
migrations/
├── 001_create_badge_system_core.sql          ← Run first
├── 002_create_valid_recipe_added_view.sql    ← Anti-gaming
├── 003_create_badge_catalog_tables.sql       ← Badge tables
├── 004_seed_badges_and_tiers.sql             ← 16 badges seeded
├── 005_create_badge_functions.sql            ← Award logic
├── 006_create_badge_rpcs.sql                 ← Client RPCs
└── 007_enable_rls_and_grants.sql             ← Security
```

### Client Code
```
src/
├── lib/badges.ts                              ← Event logging utilities
├── components/badges/
│   ├── BadgeToast.tsx                         ← Toast notifications
│   └── BadgeCard.tsx                          ← Badge display
└── app/badges/page.tsx                        ← Badges page (/badges)
```

### Documentation
```
BADGE_EVENT_INTEGRATION_GUIDE.md               ← How to wire events
BADGE_SCHEDULER_SETUP.md                       ← Nightly scheduler
README_BADGE_SYSTEM.md                         ← Quick reference
BADGE_IMPLEMENTATION_COMPLETE.md               ← Detailed summary
```

---

## ⚡ Quick Start (30 Minutes)

### Step 1: Run Migrations (10 min)

Open Supabase SQL Editor and run each file in order:

```sql
-- Copy/paste content from each file:
migrations/001_create_badge_system_core.sql
migrations/002_create_valid_recipe_added_view.sql
migrations/003_create_badge_catalog_tables.sql
migrations/004_seed_badges_and_tiers.sql
migrations/005_create_badge_functions.sql
migrations/006_create_badge_rpcs.sql
migrations/007_enable_rls_and_grants.sql
```

**Verify it worked:**
```sql
SELECT COUNT(*) FROM public.badges;  -- Should return 16
```

### Step 2: Add Toast Provider (5 min)

Edit `src/app/layout.tsx`:

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

### Step 3: Test It (5 min)

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/badges`
3. You should see the badges page! ✨

### Step 4: Log Your First Event (10 min)

In Supabase SQL Editor (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- Replace YOUR_USER_ID with your auth.uid()
SELECT public.log_event_and_award(
  'recipe_added'::public.user_event_type,
  NULL::bigint,
  NULL::uuid,
  '{
    "name": "My First Recipe",
    "has_ingredients": true,
    "instructions_len": 200,
    "has_photo": false,
    "source_url": "",
    "imported": false
  }'::jsonb
);

-- Check your badges
SELECT * FROM public.user_badges WHERE user_id = 'YOUR_USER_ID';
```

Refresh the `/badges` page - you should see progress! 🎉

---

## 🎯 Next Steps (2-4 Hours)

### Wire Event Logging Throughout Your App

Follow **BADGE_EVENT_INTEGRATION_GUIDE.md** for detailed instructions.

**Priority 1** (Do these first):

#### 1. Recipe Added - Manual Creation

In `src/app/add/manual/page.tsx`, after successful recipe save:

```typescript
import { logEventAndAward } from '@/lib/badges';
import { useBadgeToast } from '@/components/badges/BadgeToast';

// In your component
const { showBadgeAwards } = useBadgeToast();

// After recipe is saved
try {
  const result = await logEventAndAward('recipe_added', {
    name: recipe.title,
    has_ingredients: ingredients.length > 0,
    instructions_len: instructions.map(i => i.text).join('').length,
    has_photo: !!recipe.imageUrl,
    source_url: '',
    imported: false  // Original recipe!
  }, recipeData.user_recipe_id);
  
  if (result?.awards?.length > 0) {
    showBadgeAwards(result.awards);
  }
} catch (error) {
  console.error('Error logging event:', error);
}
```

See `src/app/add/manual/page-with-badges.tsx.example` for complete example.

#### 2. Recipe Added - URL Import

In `src/app/add/page.tsx`, after successful import.

#### 3. Calendar Added

In `src/app/calendar/page.tsx`, after adding recipe to calendar.

#### 4. Shopping List Generated

In `src/app/shopping-list/page.tsx`, after generating list.

---

## 🎨 16 Badges Ready to Earn

| Badge | Earn By | First Tier |
|-------|---------|------------|
| 🧑‍🍳 Recipe Maker | Adding recipes | 25 recipes |
| 🌍 Cuisine Explorer | Cooking different cuisines | 3 cuisines |
| 📚 Curator | Building collection | 5 recipes |
| 👑 Top Rated Chef | High ratings (≥4.5★) | 3 recipes |
| ⭐ Recipe Judge | Leaving reviews | 10 reviews |
| ✨ Original Creator | Adding originals | 5 recipes |
| ❤️ Crowd Favorite | Others adding your recipes | 25 adds |
| 📅 Monthly Meal Master | Planning meals | 5 plans/month |
| 🔥 Regional Specialist | Mastering one cuisine | 10 recipes |
| 🗺️ Ingredient Adventurer | Using diverse ingredients | 50 ingredients |
| 🛒 List Legend | Generating shopping lists | 5 lists |
| 🎤 Alexa Ally | Pushing to Alexa | 3 pushes |
| 🐛 Bug Hunter | Reporting bugs | 1 confirmed |
| 🧠 Chef Tony Apprentice | Asking AI questions | 10 queries |
| 🧮 Conversion Wizard | Converting units | 10 conversions |
| 🎄 Holiday Baker | December desserts | 3 desserts |

---

## 📖 Documentation Guide

**Start here:**
- 👉 **README_BADGE_SYSTEM.md** - Overview and quick reference

**For integration:**
- 👉 **BADGE_EVENT_INTEGRATION_GUIDE.md** - Where to add event logging
- 👉 **src/app/add/manual/page-with-badges.tsx.example** - Working example

**For scheduler:**
- 👉 **BADGE_SCHEDULER_SETUP.md** - Nightly badge awards setup

**For details:**
- 👉 **BADGE_IMPLEMENTATION_COMPLETE.md** - Complete feature summary
- 👉 **feature-badges-implementation.md** - Original specification

---

## 🧪 Testing Checklist

- [ ] Migrations run without errors
- [ ] `/badges` page loads successfully
- [ ] Badge link appears in navigation menu
- [ ] Can log events in SQL Editor
- [ ] Badges appear on page after events logged
- [ ] Toast shows when badge earned (after wiring events)
- [ ] Progress bars show correctly

---

## 🚨 Troubleshooting

### Events not logging?
```sql
-- Check if enum exists
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_event_type'::regtype;

-- Check RLS is configured
SELECT * FROM pg_policies WHERE tablename = 'user_events';
```

### Badges not awarding?
```sql
-- Manually trigger award
SELECT * FROM public.award_badges_for_user(auth.uid());

-- Check profiles.badges JSON
SELECT badges FROM public.profiles WHERE user_id = auth.uid();
```

### Toast not appearing?
- Check `BadgeToastProvider` wraps your app
- Ensure component is client-side (`'use client'`)
- Check browser console for errors

---

## 🎓 Key Concepts

### Event Logging
Events are logged to track user actions:
```typescript
await logEventAndAward('recipe_added', { /* metadata */ });
```

### Badge Awarding
Badges are calculated based on event counts:
- Real-time via `log_event_and_award()`
- Nightly via `award_badges_for_all_users()`

### Anti-Gaming
Prevents badge exploitation:
- 5-minute cooldown between recipe additions
- Quality checks (must have ingredients, instructions, etc.)

### Progressive Tiers
Badges have multiple levels:
- Bronze → Silver → Gold → Platinum → Diamond
- Encourages continued engagement

---

## 🛠️ Useful Commands

### SQL Testing
```sql
-- View your events
SELECT * FROM user_events WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- View your badges
SELECT * FROM user_badges WHERE user_id = auth.uid();

-- Get progress
SELECT * FROM get_badge_progress(auth.uid());

-- Manual award
SELECT * FROM award_badges_for_user(auth.uid());
```

### Client Testing
```javascript
// In browser console
const { logEventAndAward } = await import('/src/lib/badges');
const result = await logEventAndAward('recipe_added', {
  name: 'Test', has_ingredients: true, instructions_len: 200,
  has_photo: false, source_url: '', imported: false
});
console.log(result);
```

---

## 🎉 You're Ready!

The badge system is fully implemented and ready to enhance user engagement in Recipe Chef.

**What's working:**
✅ Database schema  
✅ 16 badges with progressive tiers  
✅ Event logging infrastructure  
✅ Badge page UI  
✅ Toast notifications  
✅ Anti-gaming protection  
✅ Security (RLS enabled)  

**What remains:**
🔄 Wire event logging in your app (2-4 hours)  
🔄 Set up nightly scheduler (30 min)  

---

## 📞 Need Help?

1. Check **BADGE_EVENT_INTEGRATION_GUIDE.md** for specific integration points
2. Review **page-with-badges.tsx.example** for working code
3. Test functions manually in SQL Editor
4. Check Supabase logs for errors

---

**Let's make Recipe Chef even more engaging! 🏆🎉**

Start with Step 1 above and you'll have badges running in 30 minutes!


