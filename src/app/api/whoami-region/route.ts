export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const region = (process as any).env.VERCEL_REGION ?? 'unknown'
  return new Response(JSON.stringify({ region, ts: Date.now() }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

