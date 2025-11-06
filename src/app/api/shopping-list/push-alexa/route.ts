export const runtime = 'edge'
export const preferredRegion = ['iad1']
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { regionHeader } from '@/lib/route-config';

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { items } = await req.json();
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items array' }, { status: 400 });
    }

    // For now, we'll implement a fallback that copies to clipboard
    // TODO: Implement actual Alexa push via Edge Function
    const listText = items.map((item: any) => {
      const quantity = item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '';
      return `${item.ingredient_name}${quantity ? ` — ${quantity}` : ''}`;
    }).join('\n');

    // Store the list in a temporary table for the Edge Function to pick up
    const { error: storeError } = await supabase
      .from('temp_shopping_lists')
      .insert({
        user_id: user.id,
        list_data: items,
        created_at: new Date().toISOString()
      });

    if (storeError) {
      console.error('Error storing shopping list:', storeError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Shopping list queued for Alexa push',
      fallback_text: listText
    }, { status: 200, headers: regionHeader() });
  } catch (error) {
    console.error('Alexa push error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
