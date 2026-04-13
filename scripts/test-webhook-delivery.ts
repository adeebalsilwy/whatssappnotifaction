import axios from 'axios';

async function testWebhookDelivery() {
  console.log('🚀 Testing Webhook Delivery Status Tracking...\n');

  const baseUrl = 'http://localhost:3002'; // Gateway port
  const webhookUrl = `${baseUrl}/api/webhooks/meta`;

  // Test 1: Check if webhook endpoint is accessible
  console.log('1. Testing webhook endpoint accessibility...');
  try {
    const response = await axios.get(webhookUrl);
    console.log(`   ✅ Webhook endpoint accessible - Status: ${response.status}`);
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.log('   ✅ Webhook properly requires verification');
    } else {
      console.log(`   ❌ Webhook endpoint error: ${error.response?.status || error.message}`);
    }
  }

  // Test 2: Send a test message to trigger webhook
  console.log('\n2. Sending test message...');
  try {
    const sendMessage = await axios.post(`${baseUrl}/api/notify`, {
      message: 'Test message for delivery tracking',
      to: '+967774577134',
      priority: 'high'
    });

    console.log('   ✅ Message sent successfully');
    console.log(`   Message ID: ${sendMessage.data.providerMessageId}`);
    
    // Wait a bit for potential webhook callback
    console.log('   ⏳ Waiting for potential webhook callback...');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error: any) {
    console.log(`   ❌ Error sending message: ${error.response?.data?.error || error.message}`);
  }

  // Test 3: Check delivery status API
  console.log('\n3. Checking delivery status API...');
  try {
    const statusResponse = await axios.get(`${baseUrl}/api/webhooks/meta/status`);
    console.log('   ✅ Delivery status API working');
    console.log(`   Stats: ${JSON.stringify(statusResponse.data.stats, null, 2)}`);
  } catch (error: any) {
    console.log(`   ❌ Delivery status API error: ${error.response?.status || error.message}`);
  }

  // Test 4: Check recent messages
  console.log('\n4. Checking recent messages...');
  try {
    const recentResponse = await axios.get(`${baseUrl}/api/webhooks/meta/recent?limit=5`);
    console.log('   ✅ Recent messages API working');
    console.log(`   Recent messages count: ${recentResponse.data.data?.length || 0}`);
  } catch (error: any) {
    console.log(`   ❌ Recent messages API error: ${error.response?.status || error.message}`);
  }

  console.log('\n🎉 Webhook delivery testing completed!');
  console.log('\n📊 To monitor delivery status:');
  console.log('   - Visit: http://localhost:9002/dashboard/delivery-status');
  console.log('   - Webhook URL: http://localhost:3002/api/webhooks/meta');
  console.log('   - Status API: http://localhost:3002/api/webhooks/meta/status');
}

// Run the test
testWebhookDelivery().catch(console.error);