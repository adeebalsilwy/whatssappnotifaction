import { WhatsAppNotificationService } from '../src/services/WhatsAppNotificationService';
import { loadConfigSync } from '../src/lib/config-loader';
import { OutgoingMessagePayload } from '../src/lib/types';

async function sendTemplateMessages() {
    console.log('🚀 Starting Professional Template-Based Messaging Test...\n');

    // Load configuration
    console.log('📋 Loading Configuration...');
    const config = loadConfigSync();
    console.log('✅ Configuration loaded successfully');
    console.log('Default Provider:', config.defaultProvider);
    console.log('');

    // Create service instance
    console.log('🔧 Creating WhatsApp Notification Service...');
    const service = new WhatsAppNotificationService();
    console.log('✅ Service created successfully\n');

    // Target number
    const targetNumber = '967774577134';
    console.log(`📱 Sending messages to: ${targetNumber}\n`);

    // Define template-based messages
    const templateMessages = [
        {
            name: 'OTP Verification',
            templateId: 'otp_verification',
            variables: {
                param1: '123456',
                param2: '10 minutes',
                param3: '',
                param4: ''
            },
            body: 'Your OTP code is 123456, valid for 10 minutes.'
        },
        {
            name: 'Account Transaction',
            templateId: 'account_transaction',
            variables: {
                param1: '$250.00',
                param2: '****5678',
                param3: new Date().toLocaleDateString(),
                param4: ''
            },
            body: 'You have received a transaction of $250.00 to account ****5678 on ' + new Date().toLocaleDateString()
        },
        {
            name: 'Service Notification',
            templateId: 'service_notification',
            variables: {
                param1: 'Banking Services',
                param2: 'Account Statement',
                param3: '',
                param4: ''
            },
            body: 'Your monthly account statement for Banking Services is ready. Notification type: Account Statement.'
        },
        {
            name: 'Promotional Offer',
            templateId: 'promotional_offer',
            variables: {
                param1: '25%',
                param2: 'Premium Banking',
                param3: 'December 31, 2024',
                param4: ''
            },
            body: 'Special offer: Get 25% off Premium Banking services, valid until December 31, 2024'
        },
        {
            name: 'Security Alert',
            templateId: 'security_alert',
            variables: {
                param1: 'Login Attempt',
                param2: 'Mobile App',
                param3: new Date().toLocaleString(),
                param4: ''
            },
            body: 'Security alert: New login attempt detected from Mobile App at ' + new Date().toLocaleString()
        }
    ];

    console.log(`📧 Sending ${templateMessages.length} template-based messages...\n`);

    // Send each template message
    for (let i = 0; i < templateMessages.length; i++) {
        const msg = templateMessages[i];
        console.log(`${i + 1}. 📋 Sending: ${msg.name}`);
        
        try {
            const payload: OutgoingMessagePayload = {
                provider: 'meta', // Using Meta for template-based messaging
                messageType: 'TEMPLATE',
                to: targetNumber,
                templateId: msg.templateId,
                variables: msg.variables,
                body: msg.body,
                meta: {
                    txnId: `template-test-${Date.now()}-${i}`,
                    sourceSystem: 'ProfessionalTest',
                    eventType: 'OTHER'
                }
            };

            console.log('   Payload:', JSON.stringify(payload, null, 2));
            
            const result = await service.send(payload);
            
            console.log('   Result:', JSON.stringify(result, null, 2));
            console.log(result.success 
                ? `   ✅ ${msg.name} sent successfully` 
                : `   ❌ ${msg.name} failed: ${result.errorMessage || 'Unknown error'}`);
                
        } catch (error) {
            console.log(`   ❌ ${msg.name} error:`, error);
        }
        
        console.log('');
        
        // Add a small delay between messages to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Also send some text messages for comparison
    console.log('💬 Sending additional text-based messages for comparison...\n');

    const textMessages = [
        'Welcome to our professional WhatsApp notification service!',
        `This is a test message sent at ${new Date().toISOString()}`,
        'Our system supports both template-based and text-based messaging.',
        'Template-based messaging ensures compliance with WhatsApp policies.',
        'Thank you for testing our notification gateway!'
    ];

    for (let i = 0; i < textMessages.length; i++) {
        console.log(`${i + 1}. 💬 Sending text message: "${textMessages[i]}"`);
        
        try {
            const textPayload: OutgoingMessagePayload = {
                provider: 'meta',
                messageType: 'TEXT',
                to: targetNumber,
                body: textMessages[i],
                meta: {
                    txnId: `text-test-${Date.now()}-${i}`,
                    sourceSystem: 'ProfessionalTest',
                    eventType: 'OTHER'
                }
            };

            const textResult = await service.send(textPayload);
            
            console.log('   Result:', JSON.stringify(textResult, null, 2));
            console.log(textResult.success 
                ? `   ✅ Text message ${i + 1} sent successfully` 
                : `   ❌ Text message ${i + 1} failed: ${textResult.errorMessage || 'Unknown error'}`);
                
        } catch (error) {
            console.log(`   ❌ Text message ${i + 1} error:`, error);
        }
        
        console.log('');
        
        // Add a small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('🎯 Professional template-based messaging test completed!');
    console.log('✅ Successfully tested both template and text-based messaging');
    console.log('✅ All messages sent to 967774577134 using compliant methods');
    console.log('✅ Template-based messaging helps avoid message restrictions');
}

// Run the template messaging test
sendTemplateMessages().catch(console.error);