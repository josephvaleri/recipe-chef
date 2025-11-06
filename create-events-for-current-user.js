/**
 * Create test events for the currently logged-in user
 * This will work with the actual user session
 */

const createEventsForCurrentUser = async () => {
  console.log('🔍 Creating test events for current user...');
  
  try {
    // First, let's get the current user ID from the API
    const response = await fetch('/api/my-feed?limit=1', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('❌ Could not get user info from API');
      return;
    }
    
    // Now create events using the badge events API
    console.log('1. Creating recipe_added event...');
    const recipeResponse = await fetch('/api/badges/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'recipe_added',
        meta: {
          name: 'Test Recipe for My Feed',
          has_ingredients: true,
          instructions_len: 150,
          imported: false
        }
      })
    });
    
    if (recipeResponse.ok) {
      const recipeResult = await recipeResponse.json();
      console.log('✅ Recipe event created:', recipeResult);
    } else {
      console.error('❌ Recipe event failed:', await recipeResponse.text());
    }
    
    console.log('2. Creating shopping_list_generated event...');
    const shoppingResponse = await fetch('/api/badges/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'shopping_list_generated',
        meta: {
          list_size: 15,
          categories: ['proteins', 'vegetables', 'dairy']
        }
      })
    });
    
    if (shoppingResponse.ok) {
      const shoppingResult = await shoppingResponse.json();
      console.log('✅ Shopping list event created:', shoppingResult);
    } else {
      console.error('❌ Shopping list event failed:', await shoppingResponse.text());
    }
    
    console.log('3. Creating ai_query event...');
    const aiResponse = await fetch('/api/badges/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'ai_query',
        meta: {
          question_len: 45,
          meaningful: true,
          question: 'How do I make the perfect chocolate chip cookies?'
        }
      })
    });
    
    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      console.log('✅ AI query event created:', aiResult);
    } else {
      console.error('❌ AI query event failed:', await aiResponse.text());
    }
    
    // Now check if events appear in My Feed
    console.log('4. Checking My Feed after creating events...');
    const feedResponse = await fetch('/api/my-feed?limit=10', {
      credentials: 'include'
    });
    
    if (feedResponse.ok) {
      const feedData = await feedResponse.json();
      console.log('✅ My Feed now has:', feedData.events?.length || 0, 'events');
      console.log('Events:', feedData.events);
    }
    
  } catch (error) {
    console.error('💥 Error creating events:', error);
  }
};

createEventsForCurrentUser();
