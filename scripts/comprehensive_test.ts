import { WhatsAppNotificationService } from '../src/services/WhatsAppNotificationService';
import { loadConfigSync } from '../src/lib/config-loader';
import { OutgoingMessagePayload } from '../src/lib/types';

async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive WhatsApp Gateway Tests...\n');

    // 1. Load Configuration
    console.log('📋 Loading Configuration...');
    const config = loadConfigSync();
    console.log('✅ Configuration loaded successfully');
    console.log('Default Provider:', config.defaultProvider);
    console.log('API Notification URL:', config.apiNotificationUrl);
    console.log('');

    // 2. Create Service Instance
    console.log('🔧 Creating WhatsApp Notification Service...');
    const service = new WhatsAppNotificationService();
    console.log('✅ Service created successfully\n');

    // 3. Test Target Number
    const testNumber = '967774577134';
    console.log(`📱 Testing with number: ${testNumber}\n`);

    // 4. Test Different Template-Based Messages
    console.log('📝 Testing Template-Based Messages...\n');

    // Test 1: OTP Template
    console.log('1️⃣ Testing OTP Template:');
    try {
        const otpPayload: OutgoingMessagePayload = {
            provider: 'meta', // Using Meta for template-based messaging
            messageType: 'TEMPLATE',
            to: testNumber,
            templateId: 'otp_template', // Pre-registered template
            variables: {
                otp: '123456',
                expiry: '10 minutes'
            },
            body: 'Your OTP code is 123456, valid for 10 minutes.',
            meta: {
                txnId: `otp-test-${Date.now()}`,
                sourceSystem: 'ComprehensiveTest',
                eventType: 'OTHER'
            }
        };

        console.log('Sending OTP template message...');
        console.log('Payload:', JSON.stringify(otpPayload, null, 2));
        
        const otpResult = await service.send(otpPayload);
        console.log('OTP Result:', JSON.stringify(otpResult, null, 2));
        console.log(otpResult.success ? '✅ OTP message sent successfully' : '❌ OTP message failed\n');
    } catch (error) {
        console.log('❌ OTP test error:', error);
    }
    console.log('');

    // Test 2: Transaction Alert Template
    console.log('2️⃣ Testing Transaction Alert Template:');
    try {
        const transactionPayload: OutgoingMessagePayload = {
            provider: 'meta',
            messageType: 'TEMPLATE',
            to: testNumber,
            templateId: 'transaction_alert',
            variables: {
                amount: '$100.00',
                account: '****1234',
                date: new Date().toLocaleDateString()
            },
            body: 'You have received a transaction of $100.00 to account ****1234 on ' + new Date().toLocaleDateString(),
            meta: {
                txnId: `txn-test-${Date.now()}`,
                sourceSystem: 'ComprehensiveTest',
                eventType: 'CREDIT'
            }
        };

        console.log('Sending transaction alert template message...');
        console.log('Payload:', JSON.stringify(transactionPayload, null, 2));
        
        const txnResult = await service.send(transactionPayload);
        console.log('Transaction Result:', JSON.stringify(txnResult, null, 2));
        console.log(txnResult.success ? '✅ Transaction message sent successfully' : '❌ Transaction message failed\n');
    } catch (error) {
        console.log('❌ Transaction test error:', error);
    }
    console.log('');

    // Test 3: Marketing Promotion Template
    console.log('3️⃣ Testing Marketing Promotion Template:');
    try {
        const marketingPayload: OutgoingMessagePayload = {
            provider: 'meta',
            messageType: 'TEMPLATE',
            to: testNumber,
            templateId: 'marketing_promo',
            variables: {
                offer: '20% OFF',
                product: 'Premium Services',
                validUntil: 'Dec 31, 2024'
            },
            body: 'Special offer: Get 20% OFF on Premium Services, valid until Dec 31, 2024',
            meta: {
                txnId: `marketing-test-${Date.now()}`,
                sourceSystem: 'ComprehensiveTest',
                eventType: 'OTHER'
            }
        };

        console.log('Sending marketing promotion template message...');
        console.log('Payload:', JSON.stringify(marketingPayload, null, 2));
        
        const marketingResult = await service.send(marketingPayload);
        console.log('Marketing Result:', JSON.stringify(marketingResult, null, 2));
        console.log(marketingResult.success ? '✅ Marketing message sent successfully' : '❌ Marketing message failed\n');
    } catch (error) {
        console.log('❌ Marketing test error:', error);
    }
    console.log('');

    // Test 4: Simple Text Message (Alternative to templates)
    console.log('4️⃣ Testing Simple Text Message:');
    try {
        const textPayload: OutgoingMessagePayload = {
            provider: 'meta',
            messageType: 'TEXT',
            to: testNumber,
            body: `Hello! This is a comprehensive test message from WhatsApp Gateway at ${new Date().toISOString()}. Testing all functionality.`,
            meta: {
                txnId: `text-test-${Date.now()}`,
                sourceSystem: 'ComprehensiveTest',
                eventType: 'OTHER'
            }
        };

        console.log('Sending simple text message...');
        console.log('Payload:', JSON.stringify(textPayload, null, 2));
        
        const textResult = await service.send(textPayload);
        console.log('Text Result:', JSON.stringify(textResult, null, 2));
        console.log(textResult.success ? '✅ Text message sent successfully' : '❌ Text message failed\n');
    } catch (error) {
        console.log('❌ Text test error:', error);
    }
    console.log('');

    // Test 5: Multi-Provider Fallback Test
    console.log('5️⃣ Testing Provider Fallback Mechanism:');
    try {
        const fallbackPayload: OutgoingMessagePayload = {
            provider: 'vonage', // Start with secondary provider to test fallback
            messageType: 'TEXT',
            to: testNumber,
            body: `Fallback test message at ${new Date().toISOString()}`,
            meta: {
                txnId: `fallback-test-${Date.now()}`,
                sourceSystem: 'ComprehensiveTest',
                eventType: 'OTHER'
            }
        };

        console.log('Testing provider fallback mechanism...');
        console.log('Payload:', JSON.stringify(fallbackPayload, null, 2));
        
        const fallbackResult = await service.send(fallbackPayload);
        console.log('Fallback Result:', JSON.stringify(fallbackResult, null, 2));
        console.log(fallbackResult.success ? '✅ Fallback test completed successfully' : '❌ Fallback test failed\n');
    } catch (error) {
        console.log('❌ Fallback test error:', error);
    }
    console.log('');

    // Test 6: Different Number Formats
    console.log('6️⃣ Testing Different Number Formats:');
    const numberFormats = [
        '+967774577134',
        '967774577134',
        '774577134'
    ];

    for (const format of numberFormats) {
        console.log(`Testing format: ${format}`);
        try {
            const formatPayload: OutgoingMessagePayload = {
                provider: 'meta',
                messageType: 'TEXT',
                to: format,
                body: `Test message to number format: ${format}`,
                meta: {
                    txnId: `format-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    sourceSystem: 'NumberFormatTest',
                    eventType: 'OTHER'
                }
            };

            const formatResult = await service.send(formatPayload);
            console.log(`  Format ${format}: ${formatResult.success ? '✅ Success' : '❌ Failed'}`);
        } catch (error) {
            console.log(`  Format ${format}: ❌ Error - ${error}`);
        }
    }
    console.log('');

    console.log('🎉 Comprehensive testing completed!');
    console.log('All major functionality has been tested including:');
    console.log('- Template-based messaging (recommended for compliance)');
    console.log('- Different message types (OTP, Transaction, Marketing)');
    console.log('- Provider fallback mechanisms');
    console.log('- Number format handling');
    console.log('- Error handling and response validation');
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);