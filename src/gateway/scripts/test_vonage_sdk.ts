import { VonageSDKProvider } from '../providers/vonage-sdk.provider';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testVonageSDK() {
    console.log('🧪 Testing Vonage SDK Provider (WhatsApp)\n');
    console.log('='.repeat(70));
    console.log('📋 Configuration:');
    console.log('   API Key:', process.env.VONAGE_API_KEY || 'N/A');
    console.log('   API Secret:', process.env.VONAGE_API_SECRET ? '***' : 'N/A');
    console.log('   From Number:', process.env.VONAGE_FROM_NUMBER || 'N/A');
    console.log('   Application ID:', process.env.VONAGE_APPLICATION_ID || 'N/A');
    console.log('   Endpoint:', process.env.VONAGE_API_URL || 'https://messages-sandbox.nexmo.com/v1/messages');
    console.log('='.repeat(70));

    // Load payload from sms.json if exists
    let filePayload: { message: string; mobileNo: string; priority?: string } | null = null;
    try {
        const data = fs.readFileSync(path.join(process.cwd(), 'sms.json'), 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed && parsed.message && parsed.mobileNo) {
            filePayload = { message: parsed.message, mobileNo: String(parsed.mobileNo), priority: parsed.priority || 'HIGH' };
            console.log('📄 Loaded payload from sms.json');
        }
    } catch { }

    const argv = process.argv.slice(2);
    const toArg = argv.find(a => a.startsWith('--to='))?.split('=')[1];
    const messageArg = argv.find(a => a.startsWith('--message='))?.split('=')[1];

    const tests = filePayload ? [
        { name: 'JSON File Payload', payload: filePayload }
    ] : [
        {
            name: 'First Aden Bank Test',
            payload: {
                message: messageArg || "اختباريه من بنك عدن  الاول",
                mobileNo: toArg || "967774577134",
                priority: "HIGH"
            }
        }
    ];

    // Initialise provider once
    // Note: The provider constructor will auto-detect private.key from root if not passed here
    const provider = new VonageSDKProvider({
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
        applicationId: process.env.VONAGE_APPLICATION_ID,
        // privateKey will be loaded from file by the provider if not in env
        fromNumber: process.env.VONAGE_FROM_NUMBER
    });

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`\n📤 ${test.name}`);
        console.log('-'.repeat(70));
        // Normalize phone number: remove non-digits, remove leading 00
        const to = test.payload.mobileNo.replace(/\D/g, '').replace(/^00/, '');
        const transId = `TEST-${Date.now()}`;
        try {
            const result = await provider.send(to, test.payload.message, transId);
            if (result.success) {
                console.log('✅ Sent. Provider Message ID:', result.providerMessageId);
            } else {
                console.error('❌ Send failed:', result.error);
            }
            console.log('📋 Raw Response:', JSON.stringify(result.rawResponse, null, 2));
        } catch (err: any) {
            console.error('❌ Unexpected error:', err.message);
        }
        if (i < tests.length - 1) {
            await new Promise(res => setTimeout(res, 1000));
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Testing Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Check your WhatsApp for messages');
    console.log('   2. Monitor webhooks at: ' + (process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com').replace(/\/$/, '') + '/api/webhooks/vonage/status');
}

testVonageSDK();
