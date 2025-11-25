# Debugging Paddle 400 Bad Request Error

## Current Status
- ✅ CSP headers updated (sandbox domains added)
- ✅ Error logging enhanced
- ✅ Checkout options include settings

## Next Steps to Debug

### 1. Check Network Tab Response

The 400 error should have a response body with details. In browser DevTools:

1. Open **Network** tab
2. Click Subscribe button
3. Find the failed request: `sandbox-checkout-service.paddle.com/transaction-checkout`
4. Click on it
5. Go to **Response** tab
6. Copy the full error response

The response should look like:
```json
{
  "error": {
    "type": "...",
    "detail": "...",
    "code": "..."
  }
}
```

### 2. Verify Price IDs Match Environment

Check that your price IDs are correct:

```bash
# In browser console, run:
console.log({
  annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL,
  monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY
})
```

Should show:
- `pri_01kay6np7rp3bpzesvrvztasxn` (annual)
- `pri_01kay6mp5hmy4vd9myrxgsse72` (monthly)

### 3. Verify Client Token

Check client token is set:

```bash
# In browser console:
console.log('Client token:', process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.substring(0, 20) + '...')
```

Should start with `client_`

### 4. Common 400 Error Causes

#### Price ID Not Found
**Error:** `price_not_found` or `resource_not_found`
**Solution:** 
- Verify price ID exists in Paddle Dashboard
- Ensure price is in **sandbox** environment
- Check price is **active**

#### Invalid Client Token
**Error:** `authentication_failed` or `invalid_token`
**Solution:**
- Verify token is from sandbox (not production)
- Regenerate token in Paddle Dashboard
- Restart dev server after updating `.env.local`

#### Price Type Mismatch
**Error:** `invalid_price_type` or similar
**Solution:**
- Verify both prices are **subscription** type (recurring)
- Check billing period matches (annual vs monthly)

#### Missing Required Fields
**Error:** `validation_error` or `missing_field`
**Solution:**
- Check Network tab response for specific missing field
- Verify `customer.email` is valid
- Ensure `items[0].priceId` is correct format

### 5. Test with Minimal Options

Try opening checkout with absolute minimum:

```typescript
// In browser console, after page loads:
const paddle = await getPaddle()
await paddle.Checkout.open({
  items: [{
    priceId: 'pri_01kay6np7rp3bpzesvrvztasxn', // Your annual price ID
    quantity: 1
  }]
})
```

If this works, gradually add back:
1. `customer: { email: 'test@example.com' }`
2. `customData: { ... }`
3. `settings: { ... }`

### 6. Check Paddle Dashboard

1. Go to **Products** → **Catalog**
2. Find your products
3. Verify:
   - Prices are **active** (green status)
   - Prices are in **sandbox** environment
   - Price IDs match your env vars exactly

### 7. Verify Environment Variables

Make sure `.env.local` has:

```env
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=client_xxxxx
NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL=pri_01kay6np7rp3bpzesvrvztasxn
NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY=pri_01kay6mp5hmy4vd9myrxgsse72
```

**Important:** Restart dev server after changing `.env.local`

### 8. Check Paddle.js Version

```bash
npm list @paddle/paddle-js
```

Should be `^1.4.2` or newer. If not:
```bash
npm install @paddle/paddle-js@latest
```

## What to Share for Help

If issue persists, share:

1. **Network tab response** (the actual error from Paddle)
2. **Browser console logs** (full error object)
3. **Price IDs** (first/last few chars, redact middle)
4. **Client token** (first/last few chars, redact middle)
5. **Paddle.js version**
6. **Environment** (sandbox/production)

## Quick Fixes to Try

1. **Restart dev server** after env changes
2. **Clear browser cache** and hard refresh
3. **Regenerate client token** in Paddle Dashboard
4. **Verify price IDs** are active in dashboard
5. **Check Network tab** for actual error message

