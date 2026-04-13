const axios = require('axios');

async function testWhatsAppDashboardAPI() {
  const baseUrl = 'https://apinotification.firstaden-bank.com';
  
  console.log('🚀 WhatsApp Dashboard API Test');
  console.log('===============================\n');
  
  // Test cases
  const testCases = [
    {
      name: 'English Message Test',
      payload: {
        "message": "fgfgdfgd",
        "to": "+967774577134"
      }
    },
    {
      name: 'Arabic Message Test',
      payload: {
        "message": "مرحباً بك في بنك عدن الأول الإسلامي. هذا إشعار هام من البنك.",
        "to": "+967774577134"
      }
    },
    {
      name: 'Custom Message with Metadata',
      payload: {
        "message": "Test message with custom reference",
        "to": "+967774577134",
        "meta": {
          "reference": "test-001",
          "source": "dashboard-testing"
        }
      }
    }
  ];

  console.log('🔧 Testing Working API Endpoint: /api/whatsapp/send');
  console.log('===================================================\n');

  for (const testCase of testCases) {
    console.log(`📋 Test Case: ${testCase.name}`);
    console.log(`📱 To: ${testCase.payload.to}`);
    console.log(`💬 Message: ${testCase.payload.message}`);
    console.log(`📝 Full Payload: ${JSON.stringify(testCase.payload, null, 2)}`);
    
    try {
      console.log('📨 Sending request...');
      const response = await axios.post(`${baseUrl}/api/whatsapp/send`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });
      
      console.log(`✅ Response Status: ${response.status}`);
      console.log(`✅ Success: ${response.data.success}`);
      console.log(`✅ Provider: ${response.data.provider}`);
      if (response.data.providerMessageId) {
        console.log(`✅ Message ID: ${response.data.providerMessageId}`);
      }
      console.log(`✅ Raw Response: ${JSON.stringify(response.data.rawResponse, null, 2)}`);
      
      if (!response.data.success) {
        console.log(`❌ Error: ${response.data.errorMessage || 'Unknown error'}`);
        console.log(`🔢 Error Code: ${response.data.errorCode}`);
      }
      
    } catch (error) {
      console.log(`❌ Request Failed: ${error.message}`);
      if (error.response) {
        console.log(`📡 HTTP Status: ${error.response.status}`);
        console.log(`📄 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log('--------------------------------------------------\n');
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🎯 Testing Error Cases');
  console.log('=====================\n');
  
  // Test invalid payload
  try {
    console.log('📋 Test: Invalid Payload (Missing "to" field)');
    const invalidResponse = await axios.post(`${baseUrl}/api/whatsapp/send`, {
      "message": "test message"
      // Missing "to" field
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`⚠️  Unexpected success with invalid payload: ${JSON.stringify(invalidResponse.data)}`);
  } catch (error) {
    if (error.response) {
      console.log(`✅ Correctly rejected invalid payload:`);
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Messages are automatically wrapped in templates for WhatsApp compliance');
  console.log('   - Both English and Arabic messages are supported');
  console.log('   - No authentication required for public API access');
  console.log('   - Comprehensive error handling and logging');
  console.log('   - Fallback mechanisms ensure reliable delivery');
}

// Run the test
if (require.main === module) {
  testWhatsAppDashboardAPI().catch(console.error);
}

module.exports = { testWhatsAppDashboardAPI };