# Paddle Billing Setup Guide

## Step 1: Database Migration

Run the migration to add the `paddle_subscription_id` column:

```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_paddle_subscription_id 
ON public.profiles(paddle_subscription_id) 
WHERE paddle_subscription_id IS NOT NULL;
```

Or use the migration file: `supabase/migrations/add_paddle_subscription_id.sql`

## Step 2: Paddle Dashboard Configuration

### 2.1 Create Client Token

1. Log into [Paddle Dashboard](https://vendors.paddle.com/)
2. Switch to **Sandbox** mode (top right)
3. Go to **Developer Tools** → **Client Tokens**
4. Click **Create Client Token**
5. Copy the token (starts with `client_`)
6. Repeat for **Production** when ready

### 2.2 Create Products and Prices

1. Go to **Products** → **Catalog**
2. Create two products:
   - **RecipeChef Pro Monthly** (Subscription, Monthly)
   - **RecipeChef Pro Yearly** (Subscription, Yearly)
3. For each product, create a price:
   - Set billing period (Monthly or Yearly)
   - Set price amount
   - Copy the **Price ID** (starts with `pri_`)

### 2.3 Configure Webhook

1. Go to **Developer Tools** → **Notifications**
2. Click **Add Notification**
3. Set webhook URL: `https://your-domain.com/api/paddle/webhook`
   - For local testing, use ngrok: `https://your-ngrok-url.ngrok.io/api/paddle/webhook`
4. Select these events:
   - `transaction.completed`
   - `transaction.updated`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
5. Copy the **Webhook Secret** (starts with `ntfset_`)

### 2.4 Get API Key

1. Go to **Developer Tools** → **API Keys**
2. Click **Create API Key**
3. Copy the API key (starts with `pdl_sdbx_` for sandbox)

## Step 3: Environment Variables

Add to your `.env.local`:

```env
# Paddle Billing Configuration
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=client_xxxxx
PADDLE_API_KEY=pdl_sdbx_xxxxx
PADDLE_WEBHOOK_SECRET=ntfset_xxxxx

# Price IDs from Step 2.2
NEXT_PUBLIC_RECIPECHEF_MONTHLY_PRICE_ID=pri_xxxxx
NEXT_PUBLIC_RECIPECHEF_YEARLY_PRICE_ID=pri_xxxxx
```

## Step 4: Testing Checklist

### 4.1 Frontend Testing

- [ ] Navigate to `/pricing` page
- [ ] Verify pricing cards display correctly
- [ ] Click "Buy Now" or "Subscribe"
- [ ] Verify Paddle checkout opens
- [ ] Complete test purchase with sandbox card:
  - Card: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
- [ ] Verify checkout completes successfully

### 4.2 Webhook Testing

- [ ] Check server logs for webhook events
- [ ] Verify signature verification passes
- [ ] Check database - user profile should update:
  - `status` → `'active'`
  - `role` → `'user'`
  - `trial_ends_at` → `null`
  - `paddle_subscription_id` → subscription ID (if subscription)
  - `has_ai_subscription` → `true` (if subscription created)

### 4.3 Subscription Testing

- [ ] Create a monthly subscription
- [ ] Verify `has_ai_subscription` is set to `true`
- [ ] Cancel subscription in Paddle Dashboard
- [ ] Verify webhook receives `subscription.canceled`
- [ ] Check `has_ai_subscription` is set to `false`

## Step 5: Production Deployment

1. **Switch to Production in Paddle Dashboard**
2. **Create Production Client Token**
3. **Create Production Prices**
4. **Configure Production Webhook**
5. **Update Environment Variables:**
   ```env
   NEXT_PUBLIC_PADDLE_ENV=production
   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=client_prod_xxxxx
   PADDLE_API_KEY=pdl_prod_xxxxx
   PADDLE_WEBHOOK_SECRET=ntfset_prod_xxxxx
   NEXT_PUBLIC_RECIPECHEF_MONTHLY_PRICE_ID=pri_prod_xxxxx
   NEXT_PUBLIC_RECIPECHEF_YEARLY_PRICE_ID=pri_prod_xxxxx
   ```

## Troubleshooting

### Checkout Not Opening
- Verify `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set
- Check browser console for errors
- Verify CSP headers allow Paddle domains

### Webhook Not Receiving Events
- Verify webhook URL is accessible (use ngrok for local)
- Check webhook secret matches dashboard
- Verify signature verification logic
- Check server logs for errors

### User Not Updating After Payment
- Verify `supabase_user_id` is in `customData`
- Check webhook logs for `supabase_user_id` extraction
- Verify database migration ran successfully
- Check Supabase service role key is correct

### Signature Verification Failing
- Verify `PADDLE_WEBHOOK_SECRET` matches dashboard
- Check header name is `Paddle-Signature` (not `paddle-signature`)
- Verify signature format: `ts=<timestamp>,h1=<signature>`

## Support

For Paddle Billing API documentation:
- [Paddle Billing Docs](https://developer.paddle.com/)
- [Paddle.js Reference](https://developer.paddle.com/paddlejs/overview)

