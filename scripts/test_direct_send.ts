
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
        console.log('Please set DIRECT_WHATSAPP_URL in .env.local');
        // We will attempt to use a dummy URL to show the payload structure if URL is missing, or just exit.
        // return; 
    }

    // 2. Instantiate Provider
    const provider = new DirectWhatsAppProvider();

    // 3. Prepare Payload
    // The user mentioned sending to a number directly.
    // We'll use a test number.
    const payload: OutgoingMessagePayload = {
        provider: 'direct',
        messageType: 'TEXT',
        to: '967770000000', // Example number
        body: 'Hello! This is a test message from the Direct Provider test script.',
        meta: {
            txnId: `test-${Date.now()}`
        }
    };

    console.log('Sending Payload:', JSON.stringify(payload, null, 2));

    // 4. Send Message
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
}

main().catch(console.error);
