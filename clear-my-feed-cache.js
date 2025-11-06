/**
 * Clear browser cache for My Feed endpoint
 * This will help ensure the caching fix takes effect
 */

const clearMyFeedCache = () => {
  console.log('🧹 Clearing My Feed cache...');
  
  try {
    // Step 1: Clear any existing cache entries
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          console.log('Found cache:', cacheName);
        });
      });
    }
    
    // Step 2: Force clear the cache by making requests with cache-busting
    console.log('2️⃣ Making cache-busting requests...');
    
    const cacheBustRequests = [
      '/api/my-feed?limit=20&_cb=' + Date.now(),
      '/api/my-feed?limit=20&_clear=' + Math.random(),
      '/api/my-feed?limit=20&_refresh=' + Date.now()
    ];
    
    cacheBustRequests.forEach(async (url, index) => {
      try {
        const response = await fetch(url, {
          credentials: 'include',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Cache-bust request ${index + 1}: ${data.events?.length || 0} events`);
        }
      } catch (error) {
        console.log(`Cache-bust request ${index + 1} failed:`, error.message);
      }
    });
    
    // Step 3: Test the normal endpoint after cache clearing
    console.log('3️⃣ Testing normal endpoint after cache clearing...');
    
    setTimeout(async () => {
      try {
        const response = await fetch('/api/my-feed?limit=20', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Normal endpoint after cache clear:', data.events?.length || 0, 'events');
          
          if (data.events && data.events.length > 0) {
            console.log('✅ Cache cleared successfully!');
            console.log('My Feed should now work correctly');
          } else {
            console.log('❌ Still getting 0 events after cache clear');
          }
        }
      } catch (error) {
        console.error('Error testing after cache clear:', error);
      }
    }, 1000);
    
    // Step 4: Provide instructions
    console.log('4️⃣ Additional steps to clear cache:');
    console.log('- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)');
    console.log('- Open DevTools > Network tab > check "Disable cache"');
    console.log('- Clear browser cache in settings');
    console.log('- Try incognito/private browsing mode');
    
  } catch (error) {
    console.error('💥 Cache clear failed:', error);
  }
};

// Run the cache clear
clearMyFeedCache();
