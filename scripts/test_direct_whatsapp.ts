import { DirectWhatsAppProvider } from '../src/providers/DirectWhatsAppProvider';
import { loadConfigSync } from '../src/lib/config-loader';
import { OutgoingMessagePayload } from '../src/lib/types';

async function main() {
    console.log('--- Testing Direct WhatsApp Provider ---');

    // 1. Load Config
    const config = loadConfigSync();
    console.log('Direct Provider Config:', config.providers.direct);

    if (!config.providers.direct?.url) {
        console.error('❌ Error: DIRECT_WHATSAPP_URL is not set in configuration.');
        console.log('Please set DIRECT_WHATSAPP_URL in environment variables or whatsapp-config.json');
        
        // Create a mock config for testing purposes (respects APINOTIFICATION_URL when present)
        config.providers.direct = {
            url: (process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com').replace(/\/$/, '') + '/api/whatsapp/send',
            token: 'test-token',
            from: '+967774577134'
        };
        console.log('Using mock configuration for testing...');
    }

    // 2. Instantiate Provider
    const provider = new DirectWhatsAppProvider();

    // 3. Test different phone number formats
    const testNumbers = [
        '774577134',           // Local format
        '967774577134',        // International without +
        '+967774577134',       // Full international
        '00967774577134',      // With 00 prefix
        '772123456',           // Another local number
    ];

    for (const testNumber of testNumbers) {
        console.log('\n--- Testing with number:', testNumber, '---');
        
        // 4. Prepare Payload
        const payload: OutgoingMessagePayload = {
            provider: 'direct',
            messageType: 'TEXT',
            to: testNumber,
            body: `Hello! This is a test message from the Direct Provider test script sent to ${testNumber} at ${new Date().toLocaleTimeString()}.`,
            meta: {
                txnId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sourceSystem: 'TestScript',
                eventType: 'OTHER'
            }
        };

        console.log('Sending Payload:', JSON.stringify(payload, null, 2));

        // 5. Send Message
        try {
            const result = await provider.sendTextMessage(payload, config);
            console.log('Result:', JSON.stringify(result, null, 2));

            if (result.success) {
                console.log('✅ Message send reported SUCCESS');
            } else {
                console.log('❌ Message send reported FAILURE');
                console.log('Error Code:', result.errorCode);
                console.log('Error Message:', result.errorMessage);
            }

        } catch (error) {
            console.error('❌ Exception during send:', error);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 6. Test with various message types
    console.log('\n--- Testing Different Message Types ---');
    
    const testMessages = [
        {
            name: 'Simple Text',
            body: 'This is a simple test message.'
        },
        {
            name: 'Arabic Text',
            body: 'هذه رسالة اختبار باللغة العربية'
        },
        {
            name: 'Mixed Content',
            body: 'Test message with numbers 123 and symbols @#$%'
        }
    ];
    
    for (const testMsg of testMessages) {
        console.log('\n--- Testing:', testMsg.name, '---');
        
        const payload: OutgoingMessagePayload = {
            provider: 'direct',
            messageType: 'TEXT',
            to: '+967774577134',
            body: testMsg.body,
            meta: {
                txnId: `test-msg-${Date.now()}`,
                sourceSystem: 'TestScript'
            }
        };
        
        console.log('Sending Payload:', JSON.stringify(payload, null, 2));
        
        try {
            const result = await provider.sendTextMessage(payload, config);
            console.log('Result:', JSON.stringify(result, null, 2));
            
            if (result.success) {
                console.log('✅ Message send reported SUCCESS');
            } else {
                console.log('❌ Message send reported FAILURE');
            }
        } catch (error) {
            console.error('❌ Exception during send:', error);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main().catch(console.error);