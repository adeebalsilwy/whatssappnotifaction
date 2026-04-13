const axios = require('axios');

async function testDashboardWhatsAppAPI() {
  const baseUrl = 'https://apinotification.firstaden-bank.com';
  // For local testing, use: const baseUrl = 'http://localhost:3000';
  
  console.log('🚀 Testing Dashboard WhatsApp API Endpoint');
  console.log('==========================================\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Basic message test',
      payload: {
        "message": "fgfgdfgd",
        "to": "+967774577134"
      }
    },
    {
      name: 'Arabic message test',
      payload: {
        "message": "مرحباً بك في بنك عدن الأول الإسلامي. هذا إشعار مهم من البنك.",
        "to": "+967774577134"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`📱 To: ${testCase.payload.to}`);
    console.log(`💬 Message: ${testCase.payload.message}`);
    
    try {
      const response = await axios.post(`${baseUrl}/dashboard/api/whatsapp/send`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📨 Response:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log(`🟢 Message sent successfully via ${response.data.provider}`);
        if (response.data.providerMessageId) {
          console.log(`🆔 Provider Message ID: ${response.data.providerMessageId}`);
        }
      } else {
        console.log(`🔴 Send failed: ${response.data.errorMessage || 'Unknown error'}`);
        console.log(`📋 Error Code: ${response.data.errorCode}`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      if (error.response) {
        console.log(`📡 Status: ${error.response.status}`);
        console.log(`📄 Response:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('----------------------------------------\n');
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎯 Testing invalid requests');
  
  // Test invalid payload
  try {
    const invalidResponse = await axios.post(`${baseUrl}/dashboard/api/whatsapp/send`, {
      "invalid_field": "test"
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`⚠️  Unexpected success with invalid payload:`, invalidResponse.data);
  } catch (error) {
    if (error.response) {
      console.log(`✅ Correctly rejected invalid payload:`, error.response.data);
    } else {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
  
  // Test GET method (should return 405)
  try {
    const getResponse = await axios.get(`${baseUrl}/dashboard/api/whatsapp/send`);
    console.log(`⚠️  Unexpected success with GET method:`, getResponse.data);
  } catch (error) {
    if (error.response && error.response.status === 405) {
      console.log(`✅ Correctly rejected GET method with 405 status`);
    } else {
      console.log(`⚠️  Response for GET method: ${error.message}`);
    }
  }
  
  console.log('\n🎉 All tests completed!');
}

// Run the test
testDashboardWhatsAppAPI().catch(console.error);