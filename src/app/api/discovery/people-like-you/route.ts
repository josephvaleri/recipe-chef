import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromRequest } from '@/lib/supabase-server';
import { z } from 'zod';

const q = z.object({ limit: z.coerce.number().min(1).max(100).default(20) });

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: 'Unauthorized - Please log in to discover people like you'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = q.safeParse({ limit: searchParams.get('limit') ?? undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const { data, error } = await supabase.rpc('discover_people_like_you_v2', {
      user_id: user.id,
      limit: parsed.data.limit
    });

    if (error) {
      return NextResponse.json({
        error: 'Database error',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ people: data ?? [] });

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}