/**
 * Check what events are actually showing in My Feed
 */

const checkMyFeedEvents = async () => {
  console.log('🔍 Checking My Feed events...');
  
  try {
    const response = await fetch('/api/my-feed?limit=10', {
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('My Feed events:', data.events);
    
    if (data.events && data.events.length > 0) {
      console.log('Event types found:', data.events.map(e => e.kind));
      
      // Look for BADGE_EARNED events
      const badgeEvents = data.events.filter(e => e.kind === 'BADGE_EARNED');
      console.log('Badge events found:', badgeEvents.length);
      
      if (badgeEvents.length > 0) {
        console.log('Badge events:', badgeEvents);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

checkMyFeedEvents();
