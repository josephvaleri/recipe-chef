// Test the API routes directly
// Run this in browser console on the Community page

async function testDiscoveryAPIs() {
  console.log('Testing Discovery API routes...');
  
  // Test People Like You
  try {
    console.log('Testing people-like-you...');
    const response1 = await fetch('/api/discovery/people-like-you?limit=5', {
      credentials: 'include'
    });
    console.log('People Like You Status:', response1.status);
    const data1 = await response1.text();
    console.log('People Like You Response:', data1);
  } catch (error) {
    console.error('People Like You Error:', error);
  }
  
  // Test Near Me
  try {
    console.log('Testing near-me...');
    const response2 = await fetch('/api/discovery/near-me?radiusKm=50', {
      credentials: 'include'
    });
    console.log('Near Me Status:', response2.status);
    const data2 = await response2.text();
    console.log('Near Me Response:', data2);
  } catch (error) {
    console.error('Near Me Error:', error);
  }
  
  // Test Search Profiles
  try {
    console.log('Testing search-profiles...');
    const response3 = await fetch('/api/discovery/search-profiles?q=Carole&limit=5', {
      credentials: 'include'
    });
    console.log('Search Profiles Status:', response3.status);
    const data3 = await response3.text();
    console.log('Search Profiles Response:', data3);
  } catch (error) {
    console.error('Search Profiles Error:', error);
  }
}

// Run the test
testDiscoveryAPIs();
