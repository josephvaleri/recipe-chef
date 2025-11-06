/**
 * Check if there's a user ID mismatch between API and events
 */

const checkUserMismatch = async () => {
  console.log('🔍 Checking for user ID mismatch...');
  
  try {
    // Get the current user from the API response
    const response = await fetch('/api/my-feed?limit=1', {
      credentials: 'include'
    });
    
    const data = await response.json();
    console.log('API response:', data);
    
    if (data.events && data.events.length > 0) {
      const firstEvent = data.events[0];
      console.log('First event details:', firstEvent);
      
      // Check if the event has a user_id in the payload
      if (firstEvent.payload && firstEvent.payload.user_id) {
        console.log('Event user_id:', firstEvent.payload.user_id);
      }
    }
    
    // Try to get user info from the page
    const userElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('@') || text.includes('user') || text.includes('profile');
    });
    
    console.log('User-related elements on page:', userElements.length);
    
  } catch (error) {
    console.error('Error:', error);
  }
};

checkUserMismatch();
