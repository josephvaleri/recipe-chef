// runtime: Edge for best cache/CDN behavior
export const runtime = "edge"
export const revalidate = 120 // 2 minutes ISR
export const dynamic = "force-static" // ensure this route is cacheable

export async function GET() {
  // NOTE: Using Supabase REST is fine for cacheable reads; you can swap to your own read API if needed.
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/items?select=*`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { tags: ["items:list"], revalidate: 120 }, // tag + revalidate hint
    }
  )

  if (!res.ok) {
    // Cache should not store error responses by default; still return a clear error
    return new Response(
      JSON.stringify({ error: "Failed to load items", status: res.status }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const body = await res.text()
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      // CDN and browser cache policy: adjust as you like
      "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=300"
    },
  })
}

