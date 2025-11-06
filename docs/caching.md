# Tagged Caching Pattern for Next.js API Routes

This document explains how to implement tagged caching for GET endpoints and cache invalidation on writes.

## Overview

We use Next.js 15.5.4's built-in cache tagging system to:
- Cache public GET responses at the Edge/CDN for 2-10 minutes
- Invalidate cache precisely after writes using `revalidateTag()`
- Reduce read latency and database load

## Pattern

### 1. Cacheable GET Routes (Edge Runtime)

All public read endpoints should:
- Live under `app/api/public/*`
- Use **Edge runtime** for best cache/CDN behavior
- Set `revalidate` to desired TTL (e.g., 120 seconds = 2 minutes)
- Set `dynamic = "force-static"` to ensure cacheability
- Use `next: { tags: ["<resource>:list"], revalidate: <seconds> }` on fetch calls
- Return appropriate `Cache-Control` headers

**Example:**
```ts
// app/api/public/items/route.ts
export const runtime = "edge"
export const revalidate = 120 // 2 minutes ISR
export const dynamic = "force-static"

export async function GET() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/items?select=*`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { tags: ["items:list"], revalidate: 120 },
    }
  )
  
  // ... handle response
  
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=300"
    },
  })
}
```

### 2. Write Routes (Node Runtime)

All write endpoints should:
- Use **Node runtime** (closer to Supabase)
- Set `preferredRegion` to match Supabase region (e.g., `["iad1"]`)
- Call `revalidateTag("<tag>")` after successful writes
- Use the shared `createSupabaseServer()` factory from `@/lib/supabase/server`

**Example:**
```ts
// app/api/items/route.ts
export const runtime = "nodejs"
export const preferredRegion = ["iad1"]
export const dynamic = "force-dynamic"
export const revalidate = 0

import { revalidateTag } from "next/cache"
import { createSupabaseServer } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createSupabaseServer()
  
  const { data, error } = await supabase
    .from("items")
    .insert(payload)
    .select("*")
    .single()
  
  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }
  
  // Invalidate cached list
  revalidateTag("items:list")
  
  return Response.json({ item: data }, { status: 201 })
}
```

### 3. Tag Naming Convention

- **Lists**: `"<resource>:list"` (e.g., `"items:list"`, `"recipes:list"`)
- **Details**: `"<resource>:detail:<id>"` (e.g., `"items:detail:123"`)
- **Filtered lists**: `"<resource>:<filter>"` (e.g., `"items:popular"`, `"recipes:featured"`)

### 4. Revalidating Multiple Tags

After writes, you may need to invalidate multiple tags:

```ts
// After updating an item
revalidateTag("items:list")
revalidateTag(`items:detail:${id}`)
revalidateTag("items:popular") // if you have a popular items list
```

### 5. Server Components

If you fetch directly in Server Components (not via API routes), add tags there too:

```ts
const res = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/items?select=id,name`,
  {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    next: { tags: ["items:list"], revalidate: 120 },
  }
)
```

## Cache TTL Guidelines

- **High-churn lists**: 60-120 seconds (e.g., user feeds, recent items)
- **Stable content**: 300-600 seconds (e.g., categories, static lists)
- **Very stable**: 1800+ seconds (e.g., reference data)

## Rollback

To disable caching for a route:
1. Set `export const revalidate = 0`, OR
2. Remove `export const dynamic = "force-static"`
3. Redeploy

## Testing

1. **Local testing:**
   - Hit GET endpoint twice - second response should be faster
   - Trigger a write (POST/PUT)
   - Hit GET again - should reflect changes immediately

2. **Production validation:**
   - Check Vercel dashboard for Edge Network cache hits
   - Monitor p95 latency reduction
   - Verify DB query count reduction in Supabase logs

## Best Practices

- Use distinct tags for different resource types
- Keep cache TTLs short for high-churn data
- Always revalidate relevant tags after writes
- Don't cache error responses (return appropriate status codes)
- Combine with rate limiting for write endpoints during traffic spikes

