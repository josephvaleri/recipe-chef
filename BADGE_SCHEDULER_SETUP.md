# Badge System Nightly Scheduler Setup

This document explains how to set up automatic nightly badge awarding for all users.

## Overview

The badge system includes a function `award_badges_for_all_users()` that recalculates and awards badges for all users. This should run nightly to:

- Award retroactive badges from existing data
- Handle edge cases where real-time awarding failed
- Calculate time-based badges (monthly_meal_master)
- Ensure consistency across the badge system

---

## Option 1: Supabase pg_cron (Recommended)

Supabase Pro and above includes the `pg_cron` extension for scheduled database jobs.

### Setup Steps

1. **Enable pg_cron** (if not already enabled):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Schedule the nightly job**:
   ```sql
   -- Run every night at 3:00 AM UTC
   SELECT cron.schedule(
     'badge-award-nightly',
     '0 3 * * *',
     $$SELECT public.award_badges_for_all_users();$$
   );
   ```

3. **Verify the job is scheduled**:
   ```sql
   SELECT * FROM cron.job;
   ```

4. **Check job execution history**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'badge-award-nightly')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

### Managing the Job

**Unschedule the job**:
```sql
SELECT cron.unschedule('badge-award-nightly');
```

**Change schedule time** (e.g., 2:00 AM instead):
```sql
SELECT cron.unschedule('badge-award-nightly');
SELECT cron.schedule(
  'badge-award-nightly',
  '0 2 * * *',
  $$SELECT public.award_badges_for_all_users();$$
);
```

---

## Option 2: Supabase Edge Function

If you don't have pg_cron access, use a scheduled Supabase Edge Function.

### 1. Create Edge Function

Create file: `supabase/functions/award-badges/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Verify this is coming from Supabase Scheduler (optional but recommended)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('FUNCTION_SECRET')}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting nightly badge award process...');

    // Call the database function
    const { data, error } = await supabase.rpc('award_badges_for_all_users');

    if (error) {
      console.error('Error awarding badges:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Nightly badge award completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Badges awarded for all users',
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Exception in badge award function:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### 2. Deploy Edge Function

```bash
npx supabase functions deploy award-badges
```

### 3. Set Environment Variables

In Supabase Dashboard → Functions → award-badges → Settings:

- `SUPABASE_URL`: Your project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (from Settings → API)
- `FUNCTION_SECRET`: A random secret for authorization

### 4. Schedule in Supabase Dashboard

1. Go to **Database → Functions** in Supabase Dashboard
2. Click **Create a new cron job**
3. Configure:
   - **Name**: `Badge Award Nightly`
   - **Schedule**: `0 3 * * *` (3 AM daily)
   - **HTTP Request**: `POST https://YOUR_PROJECT.supabase.co/functions/v1/award-badges`
   - **Headers**: 
     - `Authorization: Bearer YOUR_FUNCTION_SECRET`
   - **Timezone**: UTC

---

## Option 3: External Cron Service

Use an external service like Vercel Cron, GitHub Actions, or cron-job.org to trigger the edge function.

### Vercel Cron Example

Create `api/cron/award-badges.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify Vercel Cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.rpc('award_badges_for_all_users');

    if (error) {
      console.error('Error awarding badges:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Exception:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/award-badges",
    "schedule": "0 3 * * *"
  }]
}
```

---

## Manual Execution

### Award for All Users (Admin)

```sql
SELECT public.award_badges_for_all_users();
```

### Award for Single User

```sql
SELECT public.award_badges_for_user('USER_UUID_HERE');
```

### Award for Single User (from client)

```typescript
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();
const { data, error } = await supabase.rpc('award_badges_for_user', {
  p_user_id: userId // optional, defaults to current user
});

console.log('Awards:', data);
```

---

## Monitoring and Logging

### Check Last Execution Time

Add a table to track executions:

```sql
CREATE TABLE IF NOT EXISTS public.badge_award_logs (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text CHECK (status IN ('running', 'success', 'error')),
  users_processed int,
  error_message text
);

-- Grant access
GRANT SELECT ON public.badge_award_logs TO authenticated;
```

### Enhanced Function with Logging

```sql
CREATE OR REPLACE FUNCTION public.award_badges_for_all_users_with_logging()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id bigint;
  v_user_count int := 0;
  v_user_record RECORD;
BEGIN
  -- Start log
  INSERT INTO public.badge_award_logs (status)
  VALUES ('running')
  RETURNING id INTO v_log_id;
  
  -- Process users
  FOR v_user_record IN 
    SELECT user_id FROM public.profiles
  LOOP
    PERFORM public.award_badges_for_user(v_user_record.user_id);
    v_user_count := v_user_count + 1;
  END LOOP;
  
  -- Complete log
  UPDATE public.badge_award_logs
  SET 
    completed_at = now(),
    status = 'success',
    users_processed = v_user_count
  WHERE id = v_log_id;
  
EXCEPTION WHEN OTHERS THEN
  UPDATE public.badge_award_logs
  SET 
    completed_at = now(),
    status = 'error',
    error_message = SQLERRM
  WHERE id = v_log_id;
  
  RAISE;
END;
$$;
```

### View Execution History

```sql
SELECT 
  started_at,
  completed_at,
  completed_at - started_at AS duration,
  status,
  users_processed,
  error_message
FROM public.badge_award_logs
ORDER BY started_at DESC
LIMIT 20;
```

---

## Performance Considerations

### Batch Processing for Large User Bases

If you have many users (>10,000), consider batching:

```sql
CREATE OR REPLACE FUNCTION public.award_badges_for_all_users_batched(
  p_batch_size int DEFAULT 100
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_record RECORD;
  v_count int := 0;
BEGIN
  FOR v_user_record IN 
    SELECT user_id FROM public.profiles
  LOOP
    PERFORM public.award_badges_for_user(v_user_record.user_id);
    v_count := v_count + 1;
    
    -- Pause every batch
    IF v_count % p_batch_size = 0 THEN
      PERFORM pg_sleep(0.1); -- 100ms pause between batches
    END IF;
  END LOOP;
END;
$$;
```

### Run Off-Peak Hours

Schedule during low-traffic hours (typically 2-4 AM in your users' timezone).

---

## Troubleshooting

### Job Not Running

**pg_cron**:
```sql
-- Check if job exists
SELECT * FROM cron.job WHERE jobname = 'badge-award-nightly';

-- Check for errors
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;
```

**Edge Function**:
- Check Supabase Dashboard → Functions → Logs
- Verify environment variables are set
- Test manually: `curl -X POST <function-url> -H "Authorization: Bearer <secret>"`

### Slow Execution

- Check user count: `SELECT COUNT(*) FROM profiles;`
- Use batched version if > 10,000 users
- Review database performance metrics in Supabase Dashboard

### Badges Not Updating

- Check RLS policies are correct
- Verify `profiles.badges` JSON is updating
- Run manually for a test user and check results

---

## Testing the Scheduler

### Test Locally

```bash
# Test the function directly
psql -h db.YOUR_PROJECT.supabase.co -p 5432 -U postgres -d postgres \
  -c "SELECT public.award_badges_for_all_users();"
```

### Test Edge Function

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/award-badges \
  -H "Authorization: Bearer YOUR_FUNCTION_SECRET" \
  -H "Content-Type: application/json"
```

---

## Recommended Setup

For most deployments:

1. **Small apps (<1000 users)**: Use pg_cron if available
2. **Medium apps (1000-10000 users)**: Use pg_cron with logging
3. **Large apps (>10000 users)**: Use batched function + monitoring
4. **Supabase Free Tier**: Use Vercel Cron + Edge Function

---

## Summary

The badge award system is designed to run automatically every night to:
- ✅ Keep badges up-to-date
- ✅ Handle retroactive awards
- ✅ Calculate time-based achievements
- ✅ Ensure consistency

Choose the scheduler option that best fits your infrastructure and monitor execution regularly.

