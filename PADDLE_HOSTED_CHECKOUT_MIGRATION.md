# Paddle Hosted Checkout Migration - Complete

## Summary
Successfully migrated RecipeChef from Paddle.js SDK checkout to Paddle Hosted Checkout URLs. Users are now redirected to Paddle's hosted checkout pages instead of opening an overlay.

## Changes Made

### New Files Created
1. **`src/lib/payments.ts`** - Payment configuration with hosted checkout URLs
2. **`src/components/payments/pricing-section.tsx`** - New pricing component with hosted checkout redirects
3. **`src/app/pricing/pricing-client.tsx`** - Client component for back button navigation
4. **`src/app/account/billing/page.tsx`** - Placeholder billing management page

### Files Modified
1. **`src/app/pricing/page.tsx`** - Converted to server component using Supabase SSR for auth checks
2. **`package.json`** - Removed `@paddle/paddle-js` dependency
3. **`next.config.js`** - Updated CSP headers to remove Paddle.js entries, added hosted checkout domains
4. **`README.md`** - Updated environment variables documentation

### Files Deleted
1. **`src/lib/paddle.ts`** - No longer needed (Paddle.js SDK removed)
2. **`src/components/payments/paddle-checkout.tsx`** - Replaced with `pricing-section.tsx`

## Environment Variables Required

Add these to your `.env.local`:

```env
# Paddle Hosted Checkout URLs
NEXT_PUBLIC_PADDLE_MONTHLY_CHECKOUT_URL=https://sandbox-pay.paddle.io/hsc_01kaycd5wxacdskj2kvqynrt29_7a97mm2fd1b94rzqxv31d1h10nmwa4ax
NEXT_PUBLIC_PADDLE_ANNUAL_CHECKOUT_URL=https://sandbox-pay.paddle.io/hsc_01kaycb8r27cx8yb9f477vbe6d_7x4xy9jtv7zqs3f25pr5qbwmjmpsy7rc

# Paddle Webhook Configuration (for payment processing)
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
```

## How It Works

### Authentication Flow
1. **Unauthenticated users**: Clicking "Subscribe" redirects to `/auth/signin?redirectTo=/pricing`
2. **After sign-in**: User is redirected back to `/pricing`
3. **Authenticated users**: Clicking "Subscribe" redirects directly to the hosted checkout URL

### Subscription Status Check
- Server-side check using Supabase SSR
- User has active subscription if:
  - `profile.status === 'active'` OR
  - `profile.paddle_subscription_id IS NOT NULL`
- Active subscribers see "Manage Subscription" button (links to `/account/billing`)

### Pricing Component Behavior
- Shows two plans: Monthly ($0.99/month) and Annual ($9.99/year)
- Validates checkout URLs are configured
- Shows loading state during redirect
- Disables buttons if checkout URLs are missing

## Routes

- `/pricing` - Pricing page (server component with SSR auth check)
- `/account/billing` - Billing management page (placeholder)
- `/auth/signin?redirectTo=/pricing` - Sign-in with redirect back to pricing

## Next Steps

1. **Install dependencies**: Run `npm install` to remove `@paddle/paddle-js` from `node_modules`
2. **Add environment variables**: Add the hosted checkout URLs to `.env.local`
3. **Test the flow**:
   - Visit `/pricing` as unauthenticated user
   - Click "Subscribe" → should redirect to sign-in
   - After sign-in → should return to pricing
   - Click "Subscribe" → should redirect to hosted checkout
4. **Configure Paddle webhooks**: Ensure webhook handler at `/api/paddle/webhook` is configured to handle hosted checkout events

## Notes

- The webhook handler (`src/app/api/paddle/webhook/route.ts`) should continue to work with hosted checkout events
- CSP headers have been updated to allow redirects to `sandbox-pay.paddle.io` and `pay.paddle.io`
- The billing management page (`/account/billing`) is a placeholder - implement full subscription management as needed

