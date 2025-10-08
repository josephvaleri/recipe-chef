import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingListItem {
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

interface AlexaListResponse {
  listId: string;
  name: string;
  state: string;
  version: number;
  items: Array<{
    id: string;
    value: string;
    status: string;
    createdTime: string;
    updatedTime: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, items } = await req.json();

    if (!user_id || !items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's Alexa connection (OAuth tokens)
    const { data: connection, error: connectionError } = await supabase
      .from('user_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user_id)
      .eq('provider', 'alexa')
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ 
          error: 'Alexa not connected',
          message: 'Please connect your Alexa account in settings'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    if (new Date(connection.expires_at) <= new Date()) {
      // TODO: Implement token refresh logic
      // For now, return error if token is expired
      return new Response(
        JSON.stringify({ 
          error: 'Alexa token expired',
          message: 'Please reconnect your Alexa account'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create "Recipe Chef" list
    const listName = 'Recipe Chef';
    let listId: string;

    try {
      // Try to find existing list
      const listsResponse = await fetch('https://api.amazonalexa.com/v2/householdlists/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!listsResponse.ok) {
        throw new Error(`Failed to fetch lists: ${listsResponse.status}`);
      }

      const listsData = await listsResponse.json();
      const existingList = listsData.lists?.find((list: any) => list.name === listName);

      if (existingList) {
        listId = existingList.listId;
      } else {
        // Create new list
        const createListResponse = await fetch('https://api.amazonalexa.com/v2/householdlists/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: listName,
            state: 'active'
          })
        });

        if (!createListResponse.ok) {
          throw new Error(`Failed to create list: ${createListResponse.status}`);
        }

        const createListData = await createListResponse.json();
        listId = createListData.listId;
      }
    } catch (error) {
      console.error('Error managing Alexa list:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to access Alexa lists',
          message: 'Please check your Alexa connection'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add items to the list
    const results = [];
    for (const item of items) {
      try {
        const itemText = `${item.ingredient_name}${item.quantity ? ` — ${item.quantity} ${item.unit || ''}`.trim() : ''}`;
        
        const addItemResponse = await fetch(`https://api.amazonalexa.com/v2/householdlists/${listId}/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: itemText,
            status: 'active'
          })
        });

        if (addItemResponse.ok) {
          results.push({ success: true, item: itemText });
        } else {
          results.push({ success: false, item: itemText, error: addItemResponse.status });
        }
      } catch (error) {
        console.error(`Error adding item ${item.ingredient_name}:`, error);
        results.push({ success: false, item: item.ingredient_name, error: 'Network error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Added ${successCount} of ${totalCount} items to Alexa list "${listName}"`,
        results,
        listId
      }),
      { 
        status: successCount > 0 ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Alexa push error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to push to Alexa'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
