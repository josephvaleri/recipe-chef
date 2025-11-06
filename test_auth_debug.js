// Debug authentication issues with Discovery API
// This script will help identify why the API calls are failing

const testAuthDebug = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing Authentication Debug...\n');
  
  // First, let's try to get the current session
  console.log('1. Testing session endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/session`, {
      credentials: 'include',
    });
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
  
  console.log('\n');
  
  // Test with explicit headers
  console.log('2. Testing Discovery API with explicit headers...');
  try {
    const response = await fetch(`${baseUrl}/api/discovery/people-like-you?limit=5`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
  
  console.log('\n');
  
  // Test the search endpoint (which should work)
  console.log('3. Testing search endpoint (should work)...');
  try {
    const response = await fetch(`${baseUrl}/api/discovery/search?q=test&limit=5`, {
      credentials: 'include',
    });
    
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
  
  console.log('\n🔍 Auth debug completed!');
};

// Run the test
testAuthDebug().catch(console.error);
