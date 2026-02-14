import axios from 'axios';

async function testNotify() {
    const base = process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com';
    const url = `${base.replace(/\/$/, '')}/api/notify`; 

    console.log('--- Sending Test Notification ---');
    console.log('⚠️  IMPORTANT: Make sure you whitelisted your number in Vonage Sandbox!');
    console.log('   Send "Join old blank" to +14157386102 on WhatsApp\n');

    const payload = {
        message: "🎉 Test from Notification Gateway - " + new Date().toLocaleString('ar-YE'),
        mobileNo: "967774577134", // Your number (must be whitelisted in sandbox)
        priority: "HIGH"
    };

    try {
        console.log('Sending to:', url);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const res = await axios.post(url, payload);
        console.log('\n✅ Response Status:', res.status);
        console.log('Response Body:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.error('\n❌ Error sending notification:', err.message);
        if (err.response) {
            console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

testNotify();
