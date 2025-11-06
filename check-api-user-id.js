/**
 * Check what user ID the API is actually using
 */

const checkApiUserId = async () => {
  console.log('🔍 Checking API user ID...');
  
  try {
    // Check the debug auth endpoint
    const authResponse = await fetch('/api/debug-auth', {
      credentials: 'include'
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('🔍 Auth data:', authData);
      
      if (authData.debug && authData.debug.user) {
        console.log('✅ Current user ID:', authData.debug.user.id);
        console.log('✅ Current user email:', authData.debug.user.email);
      }
    }
    
    // Also check the My Feed API response headers
    const feedResponse = await fetch('/api/my-feed?limit=1', {
      credentials: 'include'
    });
    
    console.log('🔍 My Feed response headers:', Object.fromEntries(feedResponse.headers.entries()));
    
    // Check if there are any cookies that might indicate the user
    console.log('🔍 Document cookies:', document.cookie);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
};

checkApiUserId();
