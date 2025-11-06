/**
 * Create events for the currently logged-in user
 */

const createEventsForCurrentUser = async () => {
  console.log('🔍 Creating events for current user...');
  
  try {
    // First, let's check what user we're logged in as
    console.log('1️⃣ Checking current user...');
    const authResponse = await fetch('/api/debug-auth', {
      credentials: 'include'
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Current user:', authData);
    }
    
    // Create a simple recipe_added event
    console.log('2️⃣ Creating recipe_added event...');
    const recipeEvent = await fetch('/api/badges/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'recipe_added',
        meta: {
          name: 'Test Recipe for Current User',
          has_ingredients: true,
          instructions_len: 150,
          imported: false
        }
      })
    });
    
    console.log('Recipe event response:', {
      status: recipeEvent.status,
      ok: recipeEvent.ok
    });
    
    if (recipeEvent.ok) {
      const result = await recipeEvent.json();
      console.log('Recipe event result:', result);
    } else {
      const errorText = await recipeEvent.text();
      console.log('Recipe event error:', errorText);
    }
    
    // Create a shopping list event
    console.log('3️⃣ Creating shopping_list_generated event...');
    const shoppingEvent = await fetch('/api/badges/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'shopping_list_generated',
        meta: {
          item_count: 5,
          recipe_count: 2
        }
      })
    });
    
    console.log('Shopping event response:', {
      status: shoppingEvent.status,
      ok: shoppingEvent.ok
    });
    
    if (shoppingEvent.ok) {
      const result = await shoppingEvent.json();
      console.log('Shopping event result:', result);
    } else {
      const errorText = await shoppingEvent.text();
      console.log('Shopping event error:', errorText);
    }
    
    // Wait a moment for the events to be processed
    console.log('4️⃣ Waiting for events to be processed...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check My Feed
    console.log('5️⃣ Checking My Feed...');
    const feedResponse = await fetch('/api/my-feed?limit=10', {
      credentials: 'include'
    });
    const feedData = await feedResponse.json();
    
    console.log('My Feed after creating events:', {
      status: feedResponse.status,
      eventsCount: feedData.events?.length || 0,
      total: feedData.total
    });
    
    if (feedData.events?.length > 0) {
      console.log('✅ Success! My Feed now has events');
      console.log('Events:', feedData.events);
    } else {
      console.log('❌ Still no events in My Feed');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
};

createEventsForCurrentUser();
