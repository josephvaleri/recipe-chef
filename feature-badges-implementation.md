# Recipe Chef — Badge System & Event Logging (Supabase + Next.js)

## Goal
Introduce a flexible **achievements/badges** system powered by a normalized **event log**, with:
- Progressive **tiers**, retroactive awarder, anti-gaming rules, and nightly re-checks.
- Safe RPCs you can call from the app right after key actions (e.g., add recipe → log event → award).
- Minimal coupling: optional joins to `recipes`, `recipe_ratings`, `recipe_ingredients` if present; otherwise rely on `user_events.meta`.

## Scope
- **DB objects** (enums, tables, view, indexes)
- **Functions/RPCs** for event logging & awarding
- **RLS**: users can read their own events & badges; everyone can read catalog
- **App integration**: when/where to log events; how to show badges & progress

---

## Architecture Summary

**Write path**
1. App performs an action (e.g., user adds a recipe).
2. App calls `log_event_and_award(...)` (or `log_event(...)` then `award_badges_for_user(...)`).
3. The SQL awarder calculates progress and **upserts** improved tiers into `user_badges` and refreshes a compact `profiles.badges` JSON for UI.

**Read path**
- UI reads `badges` (catalog) & `badge_tiers` (thresholds) for informative displays.
- UI reads `user_badges` (or `profiles.badges`) to display earned tiers.
- Optional progress queries help show “Next badge in X actions”.

---

## Database Changes (What & Why)

### 1) **Enum**: `public.user_event_type`
> Canonical list of event types the app can emit.

Values (initial):  
`recipe_added`, `recipe_cooked`, `rating_left`, `photo_uploaded`, `calendar_added`, `shopping_list_generated`, `alexa_pushed`, `ai_query`, `ai_accept_result`, `recipe_added_to_other_user`, `recipe_accepted_global`, `unit_conversion_used`, `bug_report_confirmed`.

### 2) **Table**: `public.user_events`
> Append-only log of user actions. All badge logic derives from here.

Columns:
- `event_id bigserial PK`
- `user_id uuid` → FK to `profiles.user_id`
- `type user_event_type`
- `recipe_id bigint NULL` (if action is tied to a recipe)
- `other_user_id uuid NULL` (for “added to other user” etc.)
- `created_at timestamptz DEFAULT now()`
- `meta jsonb DEFAULT '{}'::jsonb` (carry action specifics; see **Event Meta Contract** below)

Indexes:
- `(user_id, type)`
- `(recipe_id)` (optional)
- `(created_at)`

### 3) **View**: `public.valid_recipe_added_events`
> **Anti-gaming** filter for `recipe_added`:  
Must have name + ingredients + instructions and **one** of:
- photo OR source URL OR instructions_len ≥ 150  
Also enforces a **5-minute cooldown** between consecutive `recipe_added` events per user.

It expects the following keys in `meta`:
- `name` (string, non-empty)
- `has_ingredients` (boolean)
- `instructions_len` (int)
- `has_photo` (boolean)
- `source_url` (string, may be empty)
- `imported` (boolean — used elsewhere for “Originals Only”)

### 4) **Badges Catalog**  
- `public.badges`: `{ badge_code PK, display_name, description, icon, family }`
- `public.badge_tiers`: `{ (badge_code, tier) PK, label, threshold }`
- `public.user_badges`: `{ (user_id, badge_code) PK, current_tier, awarded_at }`  
  Holds only the **highest** tier earned for each badge.

Seeded badges/tier sets (icons are Lucide names):
1. **recipe_maker** (25/50/100/250) — `chef-hat`
2. **cuisine_explorer** (3/5/7/10) — `globe`
3. **curator** (5/10/25/50/100) — `trophy`
4. **top_rated_chef** (3/10/25 recipes avg ≥4.5★) — `crown`
5. **recipe_judge** / **helpful_critic** (10/30/100 reviews ≥20 chars) — `star`
6. **originals_only** (5/20/50 non-imported) — `sparkles`
7. **crowd_favorite** (25/100/500 added by others) — `heart`
8. **monthly_meal_master** (5/10/15 calendar adds in month) — `calendar`
9. **regional_specialist** (10/25/50 in one cuisine) — `flame`
10. **ingredient_adventurer** (50/100/200 distinct ingredients cooked) — `list`
11. **list_legend** (5/20/50 shopping lists) — `list`
12. **alexa_ally** (3/10/25 Alexa pushes) — `timer`
13. **bug_bounty** (1/3/10 confirmed) — `trophy`
14. **chef_tony_apprentice** (10/30/100 meaningful AI Qs) — `brain-circuit`
15. **conversion_wizard** (10/30/100 unit conversions) — `sparkles`
16. **holiday_baker** (3 holiday desserts in December) — `gift`

### 5) **Functions** (PL/pgSQL)

- `upsert_user_badge(user_id, badge_code, value) RETURNS jsonb`  
  Finds the best tier for `value`; writes only if **improved**; returns JSON with `{badge_code, tier}` or `NULL`.

- `award_badges_for_user(user_id) RETURNS jsonb`  
  Computes all counters and calls `upsert_user_badge` for each badge.  
  Also **syncs** `profiles.badges` to a compact JSON array for UI.

- `award_badges_for_all_users() RETURNS void`  
  Iterates all profiles for nightly/retroactive awards.

- **RPCs** (SECURITY DEFINER, callable by clients):
  - `log_event(type, recipe_id, other_user_id, meta) RETURNS bigint` → uses `auth.uid()`.
  - `log_event_and_award(type, recipe_id, other_user_id, meta) RETURNS jsonb` → logs then awards.
  - (Optional admin helper) `admin_log_event_and_award(user_id, type, ..., meta)`

### 6) **RLS** (Row Level Security)
- `user_events`: enable RLS. Policies:
  - INSERT by `authenticated` **only for self** (`user_id = auth.uid()`).
  - SELECT by `authenticated` **only own rows**.
- `user_badges`: enable RLS. Policy:
  - SELECT by `authenticated` **only own rows**.
- `badges`, `badge_tiers`: enable RLS. Policy:
  - SELECT open to `authenticated` (read-only catalog).

### 7) **Profiles sync**
`award_badges_for_user` updates `profiles.badges` with the user’s current badges/tiers.

---

## Migration Snippets (idempotent)

> You already ran these successfully, but here are the stabilized forms in one place for Cursor to keep in your migrations folder if needed.

- **Create enum + user_events + indexes**  
- **Create anti-gaming view** (`valid_recipe_added_events`)  
- **Create badges tables + seed tiers**  
- **Create functions** (`upsert_user_badge`, `award_badges_for_user`, `award_badges_for_all_users`, `log_event`, `log_event_and_award`, optional `admin_log_event_and_award`)  
- **Set RLS policies & GRANTs**

> Keep each logical chunk as a separate migration file so you can track diffs cleanly.

---

## Event Meta Contract (what the app should send)

**Universal fields (optional unless specified by a badge rule):**
- `recipe_added`:
  - `name` (string, required by anti-gaming)
  - `has_ingredients` (bool, required)
  - `instructions_len` (int, required)
  - `has_photo` (bool) OR `source_url` (string) OR `instructions_len >= 150`
  - `imported` (bool; `false` counts for **originals_only**)
- `recipe_cooked`:
  - `cuisine` (string; used by **cuisine_explorer**, **regional_specialist**)
  - `ingredient_ids` (array of IDs; used by **ingredient_adventurer**)
  - `tags` (array<string>, optional; used by **holiday_baker** if you don’t join recipes)
  - `category` (string; optional; dessert checks)
- `rating_left`:
  - `review_len` (int; ≥20 counts as “constructive”)
- `ai_query`:
  - `question_len` (int) OR `meaningful` (bool)
- `recipe_added_to_other_user`:
  - `original_owner_id` (uuid)

---

## App Integration (Next.js / React)

### When to log (and award)

Hook the following UI flows to `log_event_and_award`:

- **Add Recipe** (save succeeds) → `recipe_added` (include anti-gaming meta; set `imported=false` for originals)
- **Cook Recipe** (user starts/finishes cooking mode) → `recipe_cooked` (include `cuisine`, `ingredient_ids`)
- **Rate/Review** → `rating_left` (include `review_len`)
- **Add to Calendar** → `calendar_added`
- **Generate Shopping List** → `shopping_list_generated`
- **Push to Alexa** → `alexa_pushed`
- **AI query** → `ai_query` (include `question_len` or `meaningful`)
- **Unit conversion action** in editor → `unit_conversion_used`
- **Global cookbook acceptance** → `recipe_accepted_global`
- **“Add to my cookbook” from another user’s recipe** → log `recipe_added_to_other_user` with `original_owner_id`

**Client call example (Supabase JS):**
```ts
await supabase.rpc('log_event_and_award', {
  p_type: 'recipe_added',
  p_meta: {
    name: form.title,
    has_ingredients: form.ingredients?.length > 0,
    instructions_len: form.instructions?.join('\n').length ?? 0,
    has_photo: !!form.photoUrl,
    source_url: form.sourceUrl || null,
    imported: false
  }
});
```

### Displaying badges
- Fetch catalog: `badges`, `badge_tiers` (public read)
- Fetch earned: `user_badges` (or `profiles.badges` JSON)
- Show icon → label → tier
- Show progress bars by comparing current counts to **next** `badge_tiers.threshold` (see the “Next tier” SQL in earlier messages)

---

## Nightly Retroactive Awarding

- If `pg_cron` is available, schedule:
  ```sql
  SELECT cron.schedule('badge-award-nightly', '0 3 * * *', $$SELECT public.award_badges_for_all_users();$$);
  ```
- Otherwise, create a Supabase **Scheduled Function** that calls `SELECT public.award_badges_for_all_users();` daily.

---

## QA & Edge Cases

- **Anti-gaming**: verify that rapid `recipe_added` events < 5 min apart don’t all count.
- **No auth in SQL Editor**: `auth.uid()` is NULL — use UUID literals when testing in the editor.
- **Optional tables**:  
  If `recipes`, `recipe_ratings`, `recipe_ingredients` are **absent**, awarder falls back to `user_events.meta`.  
  If they **exist**, it will prefer joins (e.g., average ratings, ingredient variety, cuisine).
- **Holiday Baker**: uses either meta tags/category or joins to recipe fields. Ensure at least one path is present.
- **Originals Only**: set `imported=false` for original entries; imported recipes should set `true`.

---

## Rollout Plan

1. **Migrate** DB (run migrations in order).
2. **GRANT & RLS**: ensure clients can `SELECT` catalog, `SELECT` their badges, `INSERT` their own events, and `EXECUTE` RPCs.
3. **Wire logging** in the UI for each action.
4. **Badge UI**: add a simple Badges page/panel showing earned tiers & next tier progress.
5. **Backfill (optional)**: if you already have history in other tables, write one-off SQL to insert historic `user_events` so users get retroactive badges.
6. **Schedule nightly** `award_badges_for_all_users()`.

---

## Cursor Checklist (To-Dos)

### Database
- [ ] Create `user_event_type` enum.
- [ ] Create `user_events` table + indexes.
- [ ] Create `valid_recipe_added_events` view.
- [ ] Create `badges`, `badge_tiers`, `user_badges` tables.
- [ ] Seed badges & tiers (idempotent seeds).
- [ ] Create functions: `upsert_user_badge`, `award_badges_for_user`, `award_badges_for_all_users`.
- [ ] Create RPCs: `log_event`, `log_event_and_award` (+ optional `admin_log_event_and_award`).
- [ ] Update `award_badges_for_user` to sync `profiles.badges`.
- [ ] Enable RLS on `user_events`, `user_badges`, `badges`, `badge_tiers`; add policies.
- [ ] GRANT `EXECUTE` on RPCs to `authenticated`.
- [ ] (Optional) Schedule nightly awards via `pg_cron` or Supabase Scheduler.

### App (Next.js)
- [ ] Add a small client util to call `log_event_and_award` with strongly-typed meta.
- [ ] Hook event logging in these flows:
  - [ ] Add Recipe (ensure anti-gaming meta).
  - [ ] Cook Recipe (send cuisine & ingredient_ids).
  - [ ] Rate/Review (send review_len).
  - [ ] Calendar add.
  - [ ] Generate shopping list.
  - [ ] Push to Alexa.
  - [ ] AI query (send question_len or meaningful).
  - [ ] Unit conversion used.
  - [ ] Added to other user’s cookbook (log `original_owner_id`).
  - [ ] Global acceptance event.
- [ ] Build a Badges UI:
  - [ ] Fetch `badges`, `badge_tiers`, and `user_badges` (or `profiles.badges`).
  - [ ] Map Lucide icons to badge_code.
  - [ ] Show earned tier and “next tier in X” progress (optional progress SQL).
- [ ] Add toast/banner when `log_event_and_award` returns new awards (JSON array).

---

**End of document.**
