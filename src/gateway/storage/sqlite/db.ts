import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'gateway.db');

export class DatabaseService {
    private static instance: Database | null = null;

    public static async getInstance(): Promise<Database> {
        if (!DatabaseService.instance) {
            console.log(`Initializing SQLite database at ${DB_PATH}`);
            DatabaseService.instance = await open({
                filename: DB_PATH,
                driver: sqlite3.Database
            });
            console.log('Database opened, running migrations...');
            await DatabaseService.migrate();
        }
        return DatabaseService.instance;
    }

    private static async migrate() {
        const db = DatabaseService.instance!;

        // 1. Settings Table
        await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

        // 2. Providers Table
        await db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        config TEXT
      );
    `);

        // 3. Routing Rules
        await db.exec(`
      CREATE TABLE IF NOT EXISTS routing_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel TEXT,
        provider_id TEXT,
        priority TEXT,
        match_regex TEXT
      );
    `);

        // 4. Messages
        await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        transId TEXT PRIMARY KEY,
        mobileNo TEXT,
        message TEXT,
        priority TEXT,
        selectedProvider TEXT,
        status TEXT,
        providerMessageId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        lastError TEXT
      );
    `);

        // 5. Provider Priority (بنك عدن الأول الإسلامي)
        await db.exec(`
      CREATE TABLE IF NOT EXISTS provider_priority (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id TEXT NOT NULL,
        priority INTEGER NOT NULL,
        enabled INTEGER DEFAULT 1,
        channel TEXT DEFAULT 'WHATSAPP',
        fallback_provider_id TEXT,
        retry_count INTEGER DEFAULT 3,
        retry_delay_ms INTEGER DEFAULT 5000,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, channel)
      );
    `);

        // 6. Message Templates (قوالب رسائل البنك)
        await db.exec(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_code TEXT UNIQUE NOT NULL,
        template_name_ar TEXT NOT NULL,
        template_name_en TEXT NOT NULL,
        template_body_ar TEXT NOT NULL,
        template_body_en TEXT NOT NULL,
        category TEXT,
        variables TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Seed default providers
        const count = await db.get<{ c: number }>('SELECT count(*) as c FROM providers');
        if (count && count.c === 0) {
            const stmt = await db.prepare('INSERT INTO providers (id, enabled, config) VALUES (?, ?, ?)');
            await stmt.run('meta', 0, '{}');
            await stmt.run('vonage', 1, '{"apiKey":"82f67722","apiSecret":"bd8T07s2n@e@2zN2Q!J","fromNumber":"14157386102","useSandbox":true}');
            await stmt.run('twilio', 0, '{}');
            await stmt.run('legacy', 1, '{"url":"http://10.211.163.163:7070/API/Service/Interface/v3/SendSMS","userId":"124985"}');
            await stmt.run('directPhone', 0, '{}');
            await stmt.finalize();
        }

        // Seed provider priorities
        const priorityCount = await db.get<{ c: number }>('SELECT count(*) as c FROM provider_priority');
        if (priorityCount && priorityCount.c === 0) {
            const stmt = await db.prepare('INSERT INTO provider_priority (provider_id, priority, channel, fallback_provider_id, retry_count) VALUES (?, ?, ?, ?, ?)');
            await stmt.run('vonage', 1, 'WHATSAPP', 'meta', 2);
            await stmt.run('meta', 2, 'WHATSAPP', 'twilio', 2);
            await stmt.run('twilio', 3, 'WHATSAPP', 'legacy', 2);
            await stmt.run('legacy', 4, 'SMS', null, 3);
            await stmt.finalize();
            console.log('✅ Provider priorities configured');
        }

        // Seed bank message templates
        const templatesCount = await db.get<{ c: number }>('SELECT count(*) as c FROM message_templates');
        if (templatesCount && templatesCount.c === 0) {
            const stmt = await db.prepare(`
        INSERT INTO message_templates 
        (template_code, template_name_ar, template_name_en, template_body_ar, template_body_en, category, variables) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

            await stmt.run('DEBIT_ALERT', 'تنبيه خصم', 'Debit Alert',
                'بنك عدن الأول الإسلامي\nعزيزي العميل، تم خصم مبلغ {amount} {currency} من حسابك {account_no}\nالرصيد المتاح: {balance} {currency}\nالتاريخ: {date}\nالمرجع: {txn_id}',
                'First Aden Islamic Bank\nDear Customer, Amount {amount} {currency} has been debited from your account {account_no}\nAvailable Balance: {balance} {currency}\nDate: {date}\nRef: {txn_id}',
                'TRANSACTION', '["amount","currency","account_no","balance","date","txn_id"]');

            await stmt.run('CREDIT_ALERT', 'تنبيه إيداع', 'Credit Alert',
                'بنك عدن الأول الإسلامي\nعزيزي العميل، تم إيداع مبلغ {amount} {currency} في حسابك {account_no}\nالرصيد المتاح: {balance} {currency}\nالتاريخ: {date}\nالمرجع: {txn_id}',
                'First Aden Islamic Bank\nDear Customer, Amount {amount} {currency} has been credited to your account {account_no}\nAvailable Balance: {balance} {currency}\nDate: {date}\nRef: {txn_id}',
                'TRANSACTION', '["amount","currency","account_no","balance","date","txn_id"]');

            await stmt.run('OTP_MESSAGE', 'رمز التحقق', 'OTP Verification',
                'بنك عدن الأول الإسلامي\nرمز التحقق الخاص بك: {otp}\nصالح لمدة {validity} دقائق\nلا تشارك هذا الرمز مع أي شخص\nالمرجع: {txn_id}',
                'First Aden Islamic Bank\nYour verification code: {otp}\nValid for {validity} minutes\nDo not share this code\nRef: {txn_id}',
                'OTP', '["otp","validity","txn_id"]');

            await stmt.finalize();
            console.log('✅ Bank message templates configured');
        }
    }
}
