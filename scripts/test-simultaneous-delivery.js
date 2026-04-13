const { WhatsAppNotificationService } = require('../src/services/WhatsAppNotificationService');

async function testSimultaneousDelivery() {
  console.log('🧪 Testing Simultaneous WhatsApp + FAD SMS Delivery');
  console.log('==================================================');
  
  // Create service instance
  const service = new WhatsAppNotificationService();
  
  // Test payload
  const testPayload = {
    to: '+967774577134',
    message: 'اختبار وصول الإشعارات إلى عملاء بنك عدن الأول من الـ api',
    messageType: 'TEXT'
  };
  
  console.log('📤 Sending simultaneous delivery test...');
  console.log('📱 To:', testPayload.to);
  console.log('💬 Message:', testPayload.message);
  console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');
  
  try {
    const result = await service.send(testPayload);
    
    console.log('📊 Overall Result:');
    console.log('- Success:', result.success);
    console.log('- Provider:', result.provider);
    console.log('- Provider Message ID:', result.providerMessageId || 'None');
    console.log('');
    
    if (result.rawResponse) {
      console.log('📡 Detailed Results:');
      
      if (result.rawResponse.meta) {
        console.log('  🟢 Meta (WhatsApp):');
        console.log('    - Success:', result.rawResponse.meta.success);
        console.log('    - Message ID:', result.rawResponse.meta.providerMessageId || 'None');
        if (result.rawResponse.meta.errorMessage) {
          console.log('    - Error:', result.rawResponse.meta.errorMessage);
        }
      }
      
      if (result.rawResponse.fad) {
        console.log('  🟡 FAD (SMS):');
        console.log('    - Success:', result.rawResponse.fad.success);
        console.log('    - Message ID:', result.rawResponse.fad.providerMessageId || 'None');
        if (result.rawResponse.fad.errorMessage) {
          console.log('    - Error:', result.rawResponse.fad.errorMessage);
        }
      }
      
      console.log('  📏 Total Time:', result.rawResponse.totalTimeMs, 'ms');
    }
    
    if (result.metadata) {
      console.log('');
      console.log('📈 Metadata:');
      console.log('  - Transaction ID:', result.metadata.transactionId);
      console.log('  - Meta Success:', result.metadata.metaSuccess);
      console.log('  - FAD Success:', result.metadata.fadSuccess);
      console.log('  - Delivery Time:', result.metadata.deliveryTimeMs, 'ms');
    }
    
  } catch (error) {
    console.error('❌ Error during simultaneous delivery:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testSimultaneousDelivery().catch(console.error);
}

module.exports = { testSimultaneousDelivery };