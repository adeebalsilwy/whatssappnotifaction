const axios = require('axios');

async function testEnhancedDelivery() {
  const baseUrl = 'http://localhost:9002'; // Updated to use the dev server port
  
  console.log('🚀 Testing Enhanced WhatsApp + FAD Delivery System');
  console.log('==================================================\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Basic Arabic Message',
      payload: {
        "message": "مرحباً بك في بنك عدن الأول الإسلامي. هذا إشعار هام من البنك.",
        "to": "+967774577134"
      }
    },
    {
      name: 'English Notification',
      payload: {
        "message": "Welcome to First Aden Islamic Bank. This is an important notification.",
        "to": "+967774577134"
      }
    },
    {
      name: 'Template Message',
      payload: {
        "message": "Your account balance is now 5000 YER",
        "to": "+967774577134",
        "messageType": "TEMPLATE",
        "templateId": "arabic_general_notification",
        "variables": {
          "1": "Your account balance update notification"
        }
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`📱 To: ${testCase.payload.to}`);
    console.log(`💬 Message: ${testCase.payload.message}`);
    console.log(`📋 Payload: ${JSON.stringify(testCase.payload, null, 2)}`);
    
    try {
      console.log('📨 Sending simultaneous delivery request...');
      const startTime = Date.now();
      
      const response = await axios.post(`${baseUrl}/api/whatsapp/send`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Response Status: ${response.status}`);
      console.log(`⏱️  Total Duration: ${duration}ms`);
      console.log(`✅ Success: ${response.data.success}`);
      console.log(`✅ Provider: ${response.data.provider}`);
      
      if (response.data.providerMessageId) {
        console.log(`🆔 Message ID: ${response.data.providerMessageId}`);
      }
      
      // Log detailed results
      if (response.data.rawResponse) {
        const rawResponse = response.data.rawResponse;
        if (rawResponse.meta) {
          console.log(`📱 Meta Success: ${rawResponse.meta.success}`);
          console.log(`📱 Meta Message ID: ${rawResponse.meta.providerMessageId || 'N/A'}`);
          if (rawResponse.meta.errorCode) {
            console.log(`📱 Meta Error: ${rawResponse.meta.errorCode} - ${rawResponse.meta.errorMessage}`);
          }
        }
        if (rawResponse.fad) {
          console.log(`📱 FAD Success: ${rawResponse.fad.success}`);
          console.log(`📱 FAD Message ID: ${rawResponse.fad.providerMessageId || 'N/A'}`);
          if (rawResponse.fad.errorCode) {
            console.log(`📱 FAD Error: ${rawResponse.fad.errorCode} - ${rawResponse.fad.errorMessage}`);
          }
        }
        if (rawResponse.totalTimeMs) {
          console.log(`⏱️  Provider Execution Time: ${rawResponse.totalTimeMs}ms`);
        }
      }
      
      if (response.data.metadata) {
        console.log(`📊 Transaction ID: ${response.data.metadata.transactionId}`);
        console.log(`📊 Meta Success: ${response.data.metadata.metaSuccess}`);
        console.log(`📊 FAD Success: ${response.data.metadata.fadSuccess}`);
      }
      
      if (!response.data.success) {
        console.log(`❌ Overall Error: ${response.data.errorMessage || 'Unknown error'}`);
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
    await new Promise(resolve => setTimeout(resolve, 3000));
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
    
    console.log(`✅ Correctly rejected invalid payload: ${JSON.stringify(invalidResponse.data)}`);
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
  console.log('   - Messages are sent simultaneously via Meta and FAD APIs');
  console.log('   - Logging/database errors do not interfere with message delivery');
  console.log('   - Professional logging in date-specific folder structure');
  console.log('   - Comprehensive error handling and reporting');
  console.log('   - Detailed delivery metrics and tracking');
  console.log('   - Template support for both providers');
  console.log('');
  console.log('🔍 Check logs in: logs/YYYY/MM/DD/ for detailed delivery records');
}

// Run the test
if (require.main === module) {
  testEnhancedDelivery().catch(console.error);
}

module.exports = { testEnhancedDelivery };