/**
 * Check what the My Feed API is actually returning
 */

const checkAPIResponse = async () => {
  console.log('🔍 Checking My Feed API response details...');
  
  try {
    const response = await fetch('/api/my-feed?limit=10', {
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('Full API response:', data);
    console.log('Events array:', data.events);
    console.log('Number of events:', data.events?.length);
    
    if (data.events && data.events.length > 0) {
      console.log('First event:', data.events[0]);
      console.log('Event types:', data.events.map(e => e.kind));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

checkAPIResponse();
