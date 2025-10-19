import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const q = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = q.safeParse({
    q: searchParams.get('q') ?? '',
    limit: searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set() {}, remove() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.rpc('search_profiles_v1', {
    p_q: parsed.data.q,
    p_limit: parsed.data.limit,
  });

  if (error) {
    console.error('RPC error (search-profiles):', error);
    return NextResponse.json({ error: 'RPC failed' }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
