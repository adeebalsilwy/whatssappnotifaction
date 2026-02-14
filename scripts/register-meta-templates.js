const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');

/**
 * Script to register templates stored in the SQLite database with Meta WhatsApp Business API.
 */

async function registerTemplates() {
    console.log('🚀 Starting template registration with Meta...');

    const accessToken = process.env.META_WHATSAPP_TOKEN;
    const wabaId = process.env.WABA_ID;
    const version = 'v24.0';

    if (!accessToken || !wabaId) {
        console.error('❌ Error: META_WHATSAPP_TOKEN and WABA_ID must be set in environment.');
        return;
    }

    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');
    const db = new Database(dbPath);
    const templates = db.prepare("SELECT * FROM templates WHERE language = 'ar'").all();

    console.log(`📋 Found ${templates.length} Arabic templates to process.`);

    for (const template of templates) {
        try {
            console.log(`🔄 Registering: ${template.name}...`);
            const components = JSON.parse(template.components);

            const response = await axios.post(
                `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
                {
                    name: template.name,
                    language: template.language,
                    category: template.category,
                    components: components,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log(`✅ Success: ${template.name} (Status: ${response.data.status})`);
        } catch (error) {
            const data = error.response?.data?.error;
            if (data?.message?.includes('already exists')) {
                console.log(`ℹ️ Already exists: ${template.name}`);
            } else {
                console.error(`❌ Failed: ${template.name}`);
                console.error(`   Error: ${data?.message || error.message}`);
                if (data?.error_user_title) {
                    console.error(`   Details: ${data.error_user_title} - ${data.error_user_msg}`);
                }
                if (data?.error_data) {
                    console.error(`   Context:`, JSON.stringify(data.error_data, null, 2));
                }
            }
        }
    }
}

registerTemplates().catch(console.error);
