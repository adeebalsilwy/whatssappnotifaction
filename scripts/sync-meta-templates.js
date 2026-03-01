const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Script to synchronize templates from Meta WhatsApp Business API to local SQLite database.
 * This ensures that local storage is always up-to-date with what's actually on Meta.
 */

async function syncTemplates() {
    console.log('🔄 Starting template synchronization from Meta...');

    // Load credentials from environment or fallback
    const accessToken = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WABA_ID;
    const version = 'v24.0';

    if (!accessToken || !wabaId) {
        console.error('❌ Error: META_WHATSAPP_TOKEN and WABA_ID must be set in environment.');
        console.log('ℹ️ Falling back to existing database templates as requested.');
        return;
    }

    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Ensure templates table exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            language TEXT NOT NULL,
            components TEXT NOT NULL,
            variables TEXT,
            description TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, language)
        );
    `);

    try {
        console.log(`📡 Fetching templates from: https://graph.facebook.com/${version}/${wabaId}/message_templates`);

        const response = await axios.get(
            `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
            {
                params: {
                    limit: 1000 // Get as many as possible
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const metaTemplates = response.data.data;
        console.log(`📋 Received ${metaTemplates.length} templates from Meta.`);

        let updatedCount = 0;
        let newCount = 0;

        for (const t of metaTemplates) {
            // Process components for professional Arabic formatting if language is 'ar'
            let components = t.components;

            if (t.language === 'ar' || t.language.startsWith('ar_')) {
                components = components.map(comp => {
                    if (comp.type === 'BODY' && comp.text) {
                        // Check if it needs professional padding (short text with placeholders)
                        const placeholders = (comp.text.match(/{{(\d+)}}/g) || []).length;
                        if (placeholders > 0 && comp.text.length < (placeholders * 20)) {
                            const paddingStart = "بنك عدن الأول الإسلامي: ";
                            const paddingEnd = " . يرجى العلم أن هذا إشعار تلقائي لضمان أمان حساباتكم وخدمتكم بشكل أفضل، نشكركم على ثقتكم بنا.";

                            if (!comp.text.startsWith(paddingStart)) {
                                comp.text = paddingStart + comp.text;
                            }
                            if (!comp.text.endsWith(paddingEnd) && (comp.text.length + paddingEnd.length) < 1024) {
                                comp.text = comp.text + paddingEnd;
                            }
                        }
                    }
                    return comp;
                });
            }

            // Extract variable names (placeholders like {{1}}, {{2}}...)
            const variables = [];
            components.forEach(comp => {
                if (comp.text) {
                    const matches = comp.text.match(/{{(\d+)}}/g);
                    if (matches) {
                        matches.forEach(m => {
                            const v = m.replace(/{{|}}/g, '');
                            if (!variables.includes(v)) variables.push(v);
                        });
                    }
                }
            });

            const result = db.prepare(`
                INSERT INTO templates (name, category, language, components, variables, updatedAt)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(name, language) DO UPDATE SET
                    category = excluded.category,
                    components = excluded.components,
                    variables = excluded.variables,
                    updatedAt = CURRENT_TIMESTAMP
            `).run(
                t.name,
                t.category,
                t.language,
                JSON.stringify(components),
                JSON.stringify(variables)
            );

            if (result.changes > 0) {
                if (result.lastInsertRowid > 0) newCount++;
                else updatedCount++;
            }
        }

        console.log(`✅ Synchronization complete!`);
        console.log(`   - New templates added: ${newCount}`);
        console.log(`   - Existing templates updated: ${updatedCount}`);

    } catch (error) {
        console.error(`❌ Failed to fetch templates from Meta API:`, error.response?.data?.error?.message || error.message);
        console.log('ℹ️ Continuing with existing local templates.');
    } finally {
        db.close();
    }
}

syncTemplates().catch(console.error);
