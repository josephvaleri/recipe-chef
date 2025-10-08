import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const days = Number(searchParams.get('days') || 7);
  const people = Number(searchParams.get('people') || 4);

  if (!start) {
    return NextResponse.json({ error: 'Missing start date' }, { status: 400 });
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    console.log('Calling generate_shopping_list with:', {
      p_user_id: user.id,
      p_start_date: start,
      p_days: days,
      p_people: people
    });

    const { data, error } = await supabase.rpc('generate_shopping_list', {
      p_user_id: user.id,
      p_start_date: start,
      p_days: days,
      p_people: people
    });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('RPC result:', data);

    // Group for UI: category → items[]
    const grouped = (data || []).reduce((acc: any, row: any) => {
      const key = row.category_name || 'Other';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        ingredient_id: row.ingredient_id,
        ingredient_name: row.ingredient_name,
        quantity: row.quantity,
        unit: row.unit
      });
      return acc;
    }, {});

    return NextResponse.json({ 
      data: grouped,
      meta: {
        start_date: start,
        days,
        people,
        total_items: Object.values(grouped).flat().length
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Shopping list generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
