// Test Discovery API endpoints directly
// This script will help debug the Near Me and Like Me functions

const testDiscoveryAPI = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing Discovery API endpoints...\n');
  
  // Test 1: People Like You endpoint
  console.log('1. Testing People Like You endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/discovery/people-like-you?limit=10`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (data.people && data.people.length > 0) {
      console.log(`   ✅ Found ${data.people.length} people like you`);
    } else {
      console.log(`   ❌ No people found (empty results)`);
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
  
  console.log('\n');
  
  // Test 2: Near Me endpoint
  console.log('2. Testing Near Me endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/discovery/near-me?radiusKm=50`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (data.people && data.people.length > 0) {
      console.log(`   ✅ Found ${data.people.length} people near you`);
    } else {
      console.log(`   ❌ No people found (empty results)`);
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
  
  console.log('\n');
  
  // Test 3: Search by name (should work)
  console.log('3. Testing Search by name endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/discovery/search?q=test&limit=10`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (data.people && data.people.length > 0) {
      console.log(`   ✅ Found ${data.people.length} people matching search`);
    } else {
      console.log(`   ❌ No people found (empty results)`);
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
  
  console.log('\n🔍 Test completed!');
};

// Run the test
testDiscoveryAPI().catch(console.error);
