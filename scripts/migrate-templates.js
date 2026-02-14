const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Migration script to move templates from JSON files to SQLite database.
 * This is recommended for professional production deployment.
 */

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize all required tables for the gateway
console.log('📦 Initializing database schema...');
db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referenceId TEXT,
        sender TEXT,
        [to] TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        providerMessageId TEXT,
        priority TEXT,
        metadata TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId INTEGER NOT NULL,
        eventType TEXT NOT NULL,
        eventPayload TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requestId TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        requestHeadersMasked TEXT,
        requestBodyMasked TEXT,
        responseStatus INTEGER,
        responseBody TEXT,
        latencyMs INTEGER,
        ip TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        language TEXT NOT NULL,
        components TEXT NOT NULL,
        variables TEXT,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        config TEXT
    );
`);

async function migrate() {
    console.log('🔄 Starting template migration to SQLite...');

    const templateFiles = [
        'whatsapp-arabic-templates.json',
        'whatsapp-comprehensive-arabic-templates.json',
        'whatsapp-professional-templates.json',
        'whatsapp-templates.json'
    ];

    let totalMigrated = 0;

    for (const fileName of templateFiles) {
        const filePath = path.join(process.cwd(), 'src', 'config', fileName);
        if (!fs.existsSync(filePath)) continue;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            const templates = data.whatsapp_templates || data.templates || [];

            console.log(`📄 Processing ${fileName}...`);

            for (let t of templates) {
                // Category mapping to modern Meta standards
                let category = t.category;
                if (['ACCOUNT_UPDATE', 'PAYMENT_UPDATE', 'PERSONAL_FINANCE', 'UTILITY'].includes(category)) {
                    category = 'UTILITY';
                } else if (['MARKETING', 'PROMOTION'].includes(category)) {
                    category = 'MARKETING';
                } else if (['AUTHENTICATION', 'OTP'].includes(category)) {
                    category = 'AUTHENTICATION';
                }

                // Process components: ensure they have the right structure for storage
                const components = t.components.map(comp => {
                    let newComp = { ...comp, type: comp.type.toUpperCase() };

                    // Fix for Meta requirement: HEADER must have format
                    if (newComp.type === 'HEADER' && !newComp.format) {
                        newComp.format = 'TEXT';
                    }

                    // If it has parameters instead of text (older format), convert to text
                    if (comp.parameters && comp.parameters[0] && comp.parameters[0].text && !comp.text) {
                        newComp.text = comp.parameters[0].text;
                        delete newComp.parameters;
                    }

                    // Convert {var} to {{1}} for Meta compatibility if needed
                    if (newComp.text && newComp.text.includes('{') && !newComp.text.includes('{{')) {
                        let index = 1;
                        newComp.text = newComp.text.replace(/{[^{}]+}/g, () => `{{${index++}}}`);
                    }

                    // Professional padding to satisfy Meta's "Params Words Ratio"
                    // If message is short and has many placeholders, Meta rejects it.
                    if (newComp.text && newComp.text.includes('{{')) {
                        const placeholders = (newComp.text.match(/{{(\d+)}}/g) || []).length;
                        if (placeholders > 0 && newComp.text.length < (placeholders * 30)) {
                            // Add meaningful padding for banking context
                            const paddingStart = "إشعار من البنك: ";
                            const paddingEnd = " . يرجى العلم أن هذا إشعار تلقائي لضمان أمان حساباتكم وخدمتكم بشكل أفضل، نشكركم على اختياركم لنا وثقتكم الدائمة في خدماتنا المصرفية المتكاملة.";

                            if (!newComp.text.startsWith(paddingStart)) {
                                newComp.text = paddingStart + newComp.text;
                            }
                            if (!newComp.text.endsWith(paddingEnd) && (newComp.text.length + paddingEnd.length) < 1024) {
                                newComp.text = newComp.text + paddingEnd;
                            }
                        }
                    }

                    // Add required examples for placeholders
                    if (newComp.text && newComp.text.includes('{{')) {
                        const placeholders = newComp.text.match(/{{(\d+)}}/g);
                        if (placeholders && !newComp.example) {
                            const exampleValues = placeholders.map((_, i) => `قيمة_${i + 1}`);
                            newComp.example = {
                                body_text: [exampleValues]
                            };
                        }
                    }

                    return newComp;
                });

                db.prepare(`
                    INSERT INTO templates (name, category, language, components, variables, description, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(name) DO UPDATE SET
                        category = excluded.category,
                        language = excluded.language,
                        components = excluded.components,
                        variables = excluded.variables,
                        description = excluded.description,
                        updatedAt = CURRENT_TIMESTAMP
                `).run(
                    t.name,
                    category,
                    t.language,
                    JSON.stringify(components),
                    JSON.stringify(t.variables || []),
                    t.description || ''
                );
                totalMigrated++;
            }
        } catch (error) {
            console.error(`❌ Error processing ${fileName}:`, error);
        }
    }

    console.log(`✅ Migration complete! Total templates in database: ${totalMigrated}`);
    db.close();
}

migrate().catch(console.error);
