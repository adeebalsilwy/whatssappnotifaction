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

// Initialize templates table
db.exec(`
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
}

migrate().catch(console.error);
