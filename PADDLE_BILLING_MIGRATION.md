# Paddle Classic to Billing Migration - Complete

## Migration Summary

Successfully migrated RecipeChef from Paddle Classic to Paddle Billing API. All Classic references have been removed and replaced with Billing implementation.

## Files Changed

### Created Files
1. **`src/lib/paddle.ts`** - Paddle Billing helper using `@paddle/paddle-js`

### Modified Files
1. **`src/components/payments/paddle-checkout.tsx`** - Updated to use Billing API
2. **`src/app/layout.tsx`** - Removed Classic script tag
3. **`src/app/api/paddle/webhook/route.ts`** - Updated signature verification and handlers
4. **`next.config.js`** - Updated CSP headers for Billing
5. **`README.md`** - Updated environment variables documentation
6. **`AGENT_CONTEXT_SUMMARY.md`** - Updated environment variables
7. **`SECURITY_FIXES.md`** - Updated CSP examples

## Key Changes

### Frontend
- ✅ Removed Classic `window.Paddle.Setup()` initialization
- ✅ Implemented `getPaddle()` helper using `@paddle/paddle-js`
- ✅ Updated checkout to use `customData.supabase_user_id`
- ✅ Changed price IDs to use `NEXT_PUBLIC_RECIPECHEF_MONTHLY_PRICE_ID` and `NEXT_PUBLIC_RECIPECHEF_YEARLY_PRICE_ID`

### Backend
- ✅ Updated webhook signature verification to Billing format (`Paddle-Signature` header)
- ✅ Replaced `createAdminClient()` with `createServerClient()` from `@supabase/ssr`
- ✅ Updated handlers to extract `supabase_user_id` from `custom_data`
- ✅ Removed email/customer_id lookups - now uses user_id directly

### Configuration
- ✅ Updated CSP headers to remove Classic URLs
- ✅ Added Billing API domain (`https://api.paddle.com`)
- ✅ Kept `checkout.paddle.com` in frame-src for checkout iframe

## Required Environment Variables

Add these to your `.env.local`:

```env
# Paddle Billing Configuration
NEXT_PUBLIC_PADDLE_ENV=sandbox  # or "production" for live
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_client_token_here
PADDLE_API_KEY=your_api_key_here
PADDLE_WEBHOOK_SECRET=your_webhook_secret_here

# Price IDs (get from Paddle Dashboard)
NEXT_PUBLIC_RECIPECHEF_MONTHLY_PRICE_ID=pri_xxxxx
NEXT_PUBLIC_RECIPECHEF_YEARLY_PRICE_ID=pri_xxxxx
```

## Paddle Dashboard Configuration Required

1. **Create Client Token**
   - Go to Developer Tools → Client Tokens
   - Create tokens for sandbox and production
   - Add to `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`

2. **Create Price IDs**
   - Create monthly and yearly prices in Products
   - Copy the Price IDs (starts with `pri_`)
   - Add to environment variables

3. **Configure Webhook**
   - Go to Developer Tools → Notifications
   - Add webhook URL: `https://your-domain.com/api/paddle/webhook`
   - Copy the webhook secret
   - Select events:
     - `transaction.completed`
     - `transaction.updated`
     - `subscription.created`
     - `subscription.updated`
     - `subscription.canceled`

## Database Schema Note

The webhook handler references `paddle_subscription_id` column. If this doesn't exist in your `profiles` table, add it:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;
```

## Testing Checklist

- [ ] Set all environment variables
- [ ] Test checkout flow in sandbox
- [ ] Verify webhook receives events
- [ ] Check user profile updates correctly
- [ ] Test subscription creation
- [ ] Test subscription cancellation
- [ ] Verify trial users upgrade correctly

## Migration Complete ✅

All Classic references have been removed. The app now uses Paddle Billing API exclusively.

