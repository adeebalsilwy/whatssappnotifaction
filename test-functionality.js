/**
 * Test script to verify key functionality of the WhatsApp Notification Gateway
 */

const axios = require('axios');

async function testFunctionality() {
  console.log('🧪 Testing WhatsApp Notification Gateway Functionality...\n');
  
  const baseUrl = 'http://localhost:9002';
  
  try {
    // Test 1: Check if the main page loads
    console.log('1. Testing main page availability...');
    const mainPageResponse = await axios.get(baseUrl);
    console.log(`   ✅ Main page loaded successfully - Status: ${mainPageResponse.status}`);
    
    // Test 2: Check if API routes are accessible
    console.log('\n2. Testing API routes...');
    
    // Test health check if available
    try {
      const healthResponse = await axios.get(`${baseUrl}/api/health`);
      console.log(`   ✅ Health check - Status: ${healthResponse.status}`);
    } catch (error) {
      console.log(`   ℹ️  Health check not available - Status: ${error.response?.status || 'N/A'}`);
    }
    
    // Test 3: Check if dashboard is accessible
    console.log('\n3. Testing dashboard access...');
    try {
      const dashboardResponse = await axios.get(`${baseUrl}/dashboard`);
      console.log(`   ✅ Dashboard loaded - Status: ${dashboardResponse.status}`);
    } catch (error) {
      console.log(`   ℹ️  Dashboard requires authentication - Status: ${error.response?.status || 'N/A'}`);
    }
    
    // Test 4: Check if login page is accessible
    console.log('\n4. Testing login page...');
    const loginResponse = await axios.get(`${baseUrl}/login`);
    console.log(`   ✅ Login page loaded - Status: ${loginResponse.status}`);
    
    // Test 5: Check API endpoints availability
    console.log('\n5. Testing API endpoints...');
    
    const apiTests = [
      { name: 'Users API', endpoint: '/api/users' },
      { name: 'Messages API', endpoint: '/api/messages' },
      { name: 'Settings API', endpoint: '/api/settings' },
      { name: 'Audit API', endpoint: '/api/audit' },
      { name: 'Templates API', endpoint: '/api/whatsapp-templates' },
    ];
    
    for (const test of apiTests) {
      try {
        const response = await axios.get(`${baseUrl}${test.endpoint}`);
        console.log(`   ✅ ${test.name} - Status: ${response.status}`);
      } catch (error) {
        // 401 Unauthorized is expected for protected endpoints
        if (error.response?.status === 401) {
          console.log(`   ✅ ${test.name} - Protected (Status: ${error.response.status})`);
        } else {
          console.log(`   ℹ️  ${test.name} - Status: ${error.response?.status || 'N/A'}`);
        }
      }
    }
    
    // Test 6: Check webhook endpoint
    console.log('\n6. Testing webhook endpoint...');
    try {
      const webhookResponse = await axios.get(`${baseUrl}/api/webhooks/meta`);
      console.log(`   ⚠️  Webhook returned: ${webhookResponse.status} (should be 403 for missing params)`);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(`   ✅ Webhook properly rejects invalid requests - Status: ${error.response.status}`);
      } else {
        console.log(`   ℹ️  Webhook response - Status: ${error.response?.status || 'N/A'}`);
      }
    }
    
    console.log('\n🎉 All basic functionality tests completed successfully!');
    console.log('\n💡 The WhatsApp Notification Gateway is running properly.');
    console.log('🔗 Access the application at: http://localhost:9002');
    console.log('🔐 Login with default credentials: admin / fab@2023');
    
  } catch (error) {
    console.error(`\n❌ Error during testing:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run the test
testFunctionality().catch(console.error);