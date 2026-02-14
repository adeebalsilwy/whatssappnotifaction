import { DatabaseService } from '../storage/sqlite/db';

async function configureVonageProduction() {
    console.log('🔧 Configuring Vonage Production for بنك عدن الأول الإسلامي\n');
    console.log('='.repeat(70));

    const db = await DatabaseService.getInstance();

    // Vonage Production Configuration
    const vonageConfig = {
        apiKey: "82f67722",
        apiSecret: "bd8T07s2n@e@2zN2Q!J",
        applicationId: "f1657174-aeb0-40bf-95c1-4feed0af22e4",
        fromNumber: "12019404006", // US Number linked to application
        useSandbox: false, // PRODUCTION MODE
        inboundUrl: "http://192.168.101.150:9089",
        statusUrl: "http://192.168.101.150:9089/BrowserWeb/servlet/BrowserLoginServlet"
    };

    await db.run('UPDATE providers SET enabled = ?, config = ? WHERE id = ?',
        1, JSON.stringify(vonageConfig), 'vonage'
    );
    console.log('✅ Vonage configured for PRODUCTION');
    console.log('   Application ID:', vonageConfig.applicationId);
    console.log('   From Number:', vonageConfig.fromNumber);
    console.log('   Mode: PRODUCTION (not sandbox)');

    // Legacy SMS Configuration
    const legacyConfig = {
        url: "http://10.211.163.163:7070/API/Service/Interface/v3/SendSMS",
        userId: "124985"
    };
    await db.run('UPDATE providers SET enabled = ?, config = ? WHERE id = ?',
        1, JSON.stringify(legacyConfig), 'legacy'
    );
    console.log('\n✅ Legacy SMS configured');
    console.log('   URL:', legacyConfig.url);
    console.log('   User ID:', legacyConfig.userId);

    // Disable others
    await db.run('UPDATE providers SET enabled = ? WHERE id = ?', 0, 'meta');
    await db.run('UPDATE providers SET enabled = ? WHERE id = ?', 0, 'twilio');
    console.log('\n✅ Meta & Twilio disabled');

    // Update provider priorities
    await db.run('UPDATE provider_priority SET priority = ?, enabled = ? WHERE provider_id = ?', 1, 1, 'vonage');
    await db.run('UPDATE provider_priority SET priority = ?, enabled = ? WHERE provider_id = ?', 2, 1, 'legacy');
    await db.run('UPDATE provider_priority SET enabled = ? WHERE provider_id = ?', 0, 'meta');
    await db.run('UPDATE provider_priority SET enabled = ? WHERE provider_id = ?', 0, 'twilio');

    console.log('\n✅ Provider priorities updated:');
    console.log('   1. Vonage (Production) - PRIMARY');
    console.log('   2. Legacy SMS - FALLBACK');

    console.log('\n' + '='.repeat(70));
    console.log('✅ Configuration Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Restart the gateway server');
    console.log('   2. Test with: npx tsx src/gateway/scripts/test_bank_messages.ts');
    console.log('   3. Monitor logs in: src/gateway/logs/');
}

configureVonageProduction().catch(err => {
    console.error('❌ Configuration failed:', err);
    process.exit(1);
});
