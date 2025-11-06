// src/lib/route-config.ts
export const EdgeWriteConfig = {
  runtime: 'edge' as const,
  preferredRegion: ['iad1'] as const,
  dynamic: 'force-dynamic' as const,
  revalidate: 0 as const,
}

export const NodeWriteConfig = {
  runtime: 'nodejs' as const,
  dynamic: 'force-dynamic' as const,
  revalidate: 0 as const,
}

export function regionHeader() {
  return { 'x-executed-region': (process as any).env.VERCEL_REGION ?? 'unknown' }
}

