/**
 * Test script for A2A functionality
 */

const { A2AMessageService } = require('../src/services/A2AMessageService');
const { loadA2AConfig } = require('../src/lib/a2a-config');

async function testA2AFunctionality() {
  console.log('🧪 Testing A2A Functionality...\n');
  
  try {
    // Load configuration
    const config = loadA2AConfig();
    console.log('✅ Configuration loaded');
    console.log('📡 A2A Host:', config.host);
    console.log('🔌 A2A Port:', config.port);
    console.log('🔗 A2A API URL:', config.apiUrl);
    console.log('');
    
    // Create A2A service instance
    const a2aService = new A2AMessageService();
    console.log('✅ A2A Service created');
    
    // Test fetching notifications (this might fail if server is not available)
    console.log('📥 Testing fetchA2ANotifications...');
    try {
      const notifications = await a2aService.fetchA2ANotifications(config);
      console.log(`✅ Successfully fetched ${notifications.length} notifications`);
      
      if (notifications.length > 0) {
        console.log('📋 Sample notification:', JSON.stringify(notifications[0], null, 2));
      }
    } catch (fetchError) {
      console.log(`⚠️  Fetch test failed (expected if server is not available): ${fetchError.message}`);
    }
    
    // Test getting stored messages
    console.log('\n📚 Testing getA2AMessages...');
    try {
      const messages = a2aService.getA2AMessages({}, 10, 0);
      console.log(`✅ Retrieved ${messages.data.length} A2A messages from database`);
      console.log('📊 Total count:', messages.total);
    } catch (getError) {
      console.log(`❌ Get messages test failed: ${getError.message}`);
      console.error(getError.stack);
    }
    
    console.log('\n🎉 A2A functionality test completed');
    console.log('\n💡 To test with actual server:');
    console.log('   - Ensure your A2A server is accessible');
    console.log('   - Verify your configuration in environment variables');
    console.log('   - Run the dashboard at /dashboard/a2a to monitor');
    
  } catch (error) {
    console.error('❌ Error during A2A functionality test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testA2AFunctionality();
}

module.exports = { testA2AFunctionality };