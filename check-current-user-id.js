/**
 * Check what user ID the API is using
 */

const checkCurrentUserId = async () => {
  console.log('🔍 Checking current user ID...');
  
  try {
    // Try to get user info from a simple API endpoint
    const response = await fetch('/api/debug-auth', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('User info from API:', data);
    } else {
      console.log('Debug auth failed, trying alternative...');
      
      // Try to get user info from the My Feed API error
      const feedResponse = await fetch('/api/my-feed?limit=1', {
        credentials: 'include'
      });
      
      console.log('My Feed response status:', feedResponse.status);
      
      if (!feedResponse.ok) {
        const errorText = await feedResponse.text();
        console.log('My Feed error:', errorText);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

checkCurrentUserId();
