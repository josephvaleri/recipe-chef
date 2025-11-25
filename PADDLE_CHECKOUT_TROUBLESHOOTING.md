# Paddle Checkout 400 Error Troubleshooting

## Error: `POST https://sandbox-checkout-service.paddle.com/transaction-checkout 400 (Bad Request)`

This error indicates the checkout request format is invalid. Follow these steps:

## Step 1: Verify Environment Variables

Check your `.env.local` file has all required variables:

```env
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=client_xxxxx  # Must start with "client_"
NEXT_PUBLIC_RECIPECHEF_MONTHLY_PRICE_ID=pri_xxxxx  # Must start with "pri_"
NEXT_PUBLIC_RECIPECHEF_YEARLY_PRICE_ID=pri_xxxxx
```

**Important:** 
- Client token must be from **sandbox** environment (starts with `client_`)
- Price IDs must be from **sandbox** environment (starts with `pri_`)
- Restart your dev server after changing `.env.local`

## Step 2: Verify Price IDs in Paddle Dashboard

1. Go to Paddle Dashboard → **Sandbox** mode
2. Navigate to **Products** → **Catalog**
3. Find your products and verify:
   - Price IDs start with `pri_`
   - Prices are **active**
   - Prices are in **sandbox** environment (not production)

## Step 3: Verify Client Token

1. Go to **Developer Tools** → **Client Tokens**
2. Ensure you're viewing **Sandbox** tokens
3. Verify the token starts with `client_`
4. If token is missing or expired, create a new one

## Step 4: Check Browser Console

After clicking Subscribe, check the browser console for:

1. **Price ID logged:** Should show `pri_xxxxx` (not `pri_xxxxx` or undefined)
2. **Error details:** Look for the full error object with:
   - `error.message`
   - `error.detail`
   - `error.code`
   - `error.errors` (array of specific errors)

## Step 5: Common Issues

### Issue: Price ID Not Found
**Error:** `price_not_found` or similar
**Solution:** 
- Verify price ID exists in Paddle Dashboard
- Ensure price is in sandbox (not production)
- Check price ID is correctly copied (no extra spaces)

### Issue: Invalid Client Token
**Error:** `authentication_failed` or `invalid_token`
**Solution:**
- Verify token is from sandbox environment
- Check token hasn't expired
- Regenerate token in Paddle Dashboard

### Issue: Price Type Mismatch
**Error:** `invalid_price_type` or similar
**Solution:**
- Monthly subscription must use a **recurring** price
- One-time purchase must use a **one-time** price
- Verify price billing type matches usage

### Issue: Customer Email Invalid
**Error:** `invalid_customer_email`
**Solution:**
- Ensure user has a valid email address
- Check email is not empty or null

## Step 6: Test with Minimal Options

Try opening checkout with minimal options to isolate the issue:

```typescript
const checkoutOptions = {
  items: [
    {
      priceId: 'pri_xxxxx', // Your actual price ID
      quantity: 1
    }
  ]
}

await paddle.Checkout.open(checkoutOptions)
```

If this works, gradually add back:
1. `customer: { email: user.email }`
2. `customData: { ... }`

## Step 7: Verify Paddle.js Version

Check your `package.json`:

```json
"@paddle/paddle-js": "^1.4.2"
```

If using an older version, update:
```bash
npm install @paddle/paddle-js@latest
```

## Step 8: Network Tab Inspection

1. Open browser DevTools → **Network** tab
2. Click Subscribe
3. Find the failed request to `sandbox-checkout-service.paddle.com`
4. Check:
   - **Request Payload:** Verify structure matches expected format
   - **Response:** Check error message in response body
   - **Headers:** Verify `Authorization` header includes token

## Step 9: Contact Paddle Support

If issue persists, contact Paddle support with:
- Full error message from console
- Request payload from Network tab
- Price ID and Client Token (redact sensitive parts)
- Paddle.js version

## Quick Checklist

- [ ] Environment variables set correctly
- [ ] Dev server restarted after env changes
- [ ] Client token is from sandbox
- [ ] Price IDs are from sandbox
- [ ] Price IDs are active in dashboard
- [ ] User email is valid
- [ ] Browser console shows detailed error
- [ ] Network tab shows request/response details

