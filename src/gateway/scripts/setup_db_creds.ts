import { DatabaseService } from '../storage/sqlite/db';

async function run() {
    console.log('--- Configuring Providers ---');

    const db = await DatabaseService.getInstance();

    // Configure Vonage with Sandbox settings
    const vonageConfig = {
        apiKey: "82f67722",
        apiSecret: "bd8T07s2n@e@2zN2Q!J",
        fromNumber: "14157386102", // Sandbox WhatsApp number
        useSandbox: true // Use sandbox API
    };

    await db.run('UPDATE providers SET enabled = ?, config = ? WHERE id = ?',
        1, JSON.stringify(vonageConfig), 'vonage'
    );
    console.log('✅ Vonage configured with Sandbox settings');

    // Configure Legacy
    const legacyConfig = {
        url: "http://10.220.172.100:7070/API/Service/Interface/v3/SendSMS"
    };
    await db.run('UPDATE providers SET enabled = ?, config = ? WHERE id = ?',
        1, JSON.stringify(legacyConfig), 'legacy'
    );
    console.log('✅ Legacy SMS configured and enabled');

    // Disable others
    await db.run('UPDATE providers SET enabled = ? WHERE id = ?', 0, 'meta');
    await db.run('UPDATE providers SET enabled = ? WHERE id = ?', 0, 'twilio');
    console.log('✅ Meta & Twilio disabled');

    console.log('\n--- Configuration Complete ---');
    console.log('📝 Important: Make sure you have whitelisted your number in Vonage Sandbox!');
    console.log('   Send "Join old blank" to +14157386102 on WhatsApp first');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
