const Database = require('better-sqlite3');
const path = require('path');

console.log('🚀 Initializing Meta WhatsApp SQLite Database...\n');

try {
    // Database path
    const dbPath = path.join(__dirname, 'gateway.db');
    console.log(`🗄️  Creating database at: ${dbPath}`);
    
    // Initialize database
    const db = new Database(dbPath);
    
    // Create tables
    console.log('📋 Creating database tables...');
    
    // Settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);
    
    // Providers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 0,
            config TEXT
        );
    `);
    
    // Messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id BIGSERIAL PRIMARY KEY,
            referenceId VARCHAR(64),
            sender VARCHAR(64),
            [to] VARCHAR(32) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(32) NOT NULL,
            providerMessageId VARCHAR(128),
            priority VARCHAR(16),
            metadata JSON,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Message events table
    db.exec(`
        CREATE TABLE IF NOT EXISTS message_events (
            id BIGSERIAL PRIMARY KEY,
            messageId BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            eventType VARCHAR(32) NOT NULL,
            eventPayload JSON,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // API logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_logs (
            id BIGSERIAL PRIMARY KEY,
            requestId TEXT NOT NULL,
            endpoint VARCHAR(128) NOT NULL,
            method VARCHAR(16) NOT NULL,
            requestHeadersMasked JSON,
            requestBodyMasked JSON,
            responseStatus INTEGER,
            responseBody JSON,
            latencyMs INTEGER,
            ip VARCHAR(64),
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Provider priority table
    db.exec(`
        CREATE TABLE IF NOT EXISTS provider_priority (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id TEXT NOT NULL,
            priority INTEGER NOT NULL,
            enabled INTEGER DEFAULT 1,
            channel TEXT DEFAULT 'WHATSAPP',
            fallback_provider_id TEXT,
            retry_count INTEGER DEFAULT 3,
            retry_delay_ms INTEGER DEFAULT 5000,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider_id, channel)
        );
    `);
    
    // Message templates table
    db.exec(`
        CREATE TABLE IF NOT EXISTS message_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_code TEXT UNIQUE NOT NULL,
            template_name_ar TEXT NOT NULL,
            template_name_en TEXT NOT NULL,
            template_body_ar TEXT NOT NULL,
            template_body_en TEXT NOT NULL,
            category TEXT,
            variables TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    // Insert default providers
    console.log('🔧 Setting up default providers...');
    
    const insertProvider = db.prepare(`
        INSERT OR REPLACE INTO providers (id, enabled, config) VALUES (?, ?, ?)
    `);
    
    insertProvider.run('meta', 1, JSON.stringify({
        url: 'https://graph.facebook.com/v24.0',
        token: 'EAAJTmdOZCOoUBQmfA0RRQ3lZCJsrt5pFLCRvYZCue0vi1mzQYG9Ufuhqw7uZARejkJrIzZCrtlSGegkyuIttFFPnluuqC86N1xNmhyZA7QOIXNr0XH2P8NFsJ37nU56qhbKNnd6gA0jwA7sTLeFhKKqTCnvtiAoLHiLUI1UZCxrs1q26XA3VWuTZBWFLImIIMHFP2QZDZD',
        numberId: '941421395727613',
        webhookVerifyToken: '774577'
    }));
    
    insertProvider.run('vonage', 1, JSON.stringify({
        url: 'https://messages-sandbox.nexmo.com/v1/messages',
        apiKey: '82f67722',
        apiSecret: 'bd8T07s2n@e@2zN2Q!J',
        from: '14157386102'
    }));
    
    insertProvider.run('generic', 0, JSON.stringify({
        url: 'http://localhost:3000/api/mock/generic',
        token: 'your-generic-provider-token'
    }));
    
    insertProvider.run('direct', 0, JSON.stringify({
        url: 'http://localhost:3001/api/whatsapp/send',
        token: 'test-token',
        from: '+967774577134'
    }));
    
    // Insert provider priorities
    console.log('⚖️  Setting up provider priorities...');
    
    const insertPriority = db.prepare(`
        INSERT OR REPLACE INTO provider_priority 
        (provider_id, priority, channel, fallback_provider_id, retry_count) 
        VALUES (?, ?, ?, ?, ?)
    `);
    
    insertPriority.run('meta', 1, 'WHATSAPP', 'vonage', 2);
    insertPriority.run('vonage', 2, 'WHATSAPP', 'twilio', 2);
    insertPriority.run('twilio', 3, 'WHATSAPP', 'legacy', 2);
    insertPriority.run('legacy', 4, 'SMS', null, 3);
    
    // Insert bank message templates
    console.log('📄 Setting up bank message templates...');
    
    const insertTemplate = db.prepare(`
        INSERT OR REPLACE INTO message_templates 
        (template_code, template_name_ar, template_name_en, template_body_ar, template_body_en, category, variables) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertTemplate.run(
        'DEBIT_ALERT',
        'تنبيه خصم',
        'Debit Alert',
        'بنك عدن الأول الإسلامي\nعزيزي العميل، تم خصم مبلغ {amount} {currency} من حسابك {account_no}\nالرصيد المتاح: {balance} {currency}\nالتاريخ: {date}\nالمرجع: {txn_id}',
        'First Aden Islamic Bank\nDear Customer, Amount {amount} {currency} has been debited from your account {account_no}\nAvailable Balance: {balance} {currency}\nDate: {date}\nRef: {txn_id}',
        'TRANSACTION',
        '["amount","currency","account_no","balance","date","txn_id"]'
    );
    
    insertTemplate.run(
        'CREDIT_ALERT',
        'تنبيه إيداع',
        'Credit Alert',
        'بنك عدن الأول الإسلامي\nعزيزي العميل، تم إيداع مبلغ {amount} {currency} في حسابك {account_no}\nالرصيد المتاح: {balance} {currency}\nالتاريخ: {date}\nالمرجع: {txn_id}',
        'First Aden Islamic Bank\nDear Customer, Amount {amount} {currency} has been credited to your account {account_no}\nAvailable Balance: {balance} {currency}\nDate: {date}\nRef: {txn_id}',
        'TRANSACTION',
        '["amount","currency","account_no","balance","date","txn_id"]'
    );
    
    insertTemplate.run(
        'OTP_MESSAGE',
        'رمز التحقق',
        'OTP Verification',
        'بنك عدن الأول الإسلامي\nرمز التحقق الخاص بك: {otp}\nصالح لمدة {validity} دقائق\nلا تشارك هذا الرمز مع أي شخص\nالمرجع: {txn_id}',
        'First Aden Islamic Bank\nYour verification code: {otp}\nValid for {validity} minutes\nDo not share this code\nRef: {txn_id}',
        'OTP',
        '["otp","validity","txn_id"]'
    );
    
    // Verify setup
    console.log('\n🔍 Verifying database setup...');
    
    const tableCount = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name IN (
            'settings', 'providers', 'messages', 'message_events', 
            'api_logs', 'provider_priority', 'message_templates'
        )
    `).get();
    
    console.log(`✅ Created ${tableCount.count} tables successfully`);
    
    const providerCount = db.prepare('SELECT COUNT(*) as count FROM providers').get();
    console.log(`✅ Configured ${providerCount.count} providers`);
    
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM message_templates').get();
    console.log(`✅ Loaded ${templateCount.count} message templates`);
    
    // Close database
    db.close();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Expose with ngrok: ngrok http 9002');
    console.log('3. Configure Meta Developer Console with ngrok URL');
    console.log('4. Test webhook verification with verify token: 774577');
    console.log('5. Send test messages to verify integration');
    
    console.log('\n=== DATABASE LOCATION ===');
    console.log(`📁 Database file: ${dbPath}`);
    console.log(`📊 Tables created: settings, providers, messages, message_events, api_logs, provider_priority, message_templates`);
    
} catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
}