const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');
const db = new Database(dbPath);

const META_WHATSAPP_API_URL = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v24.0';
const META_WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN;
const WABA_ID = process.env.WABA_ID;

if (!META_WHATSAPP_TOKEN) {
    console.error('❌ Error: Missing Meta WhatsApp API token. Please set either WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_TOKEN in your environment variables.');
    process.exit(1);
}

if (!WABA_ID) {
    console.error('❌ Error: Missing WABA ID. Please set WABA_ID in your environment variables.');
    process.exit(1);
}

/**
 * Fetches templates from Meta API
 */
async function fetchMetaTemplates() {
    console.log('🔄 Fetching templates from Meta API...');
    
    try {
        const url = `${META_WHATSAPP_API_URL}/${WABA_ID}/message_templates?access_token=${META_WHATSAPP_TOKEN}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`API Error: ${data.error?.message || response.statusText}`);
        }
        
        console.log(`✅ Retrieved ${data.data?.length || 0} templates from Meta API`);
        return data.data || [];
    } catch (error) {
        console.error('❌ Error fetching templates from Meta API:', error.message);
        throw error;
    }
}

/**
 * Converts Meta API template format to our internal format
 */
function convertMetaTemplateToInternalFormat(metaTemplate) {
    // Extract components from Meta template
    const components = metaTemplate.components || [];
    
    // Extract variables from the components
    const variables = extractVariablesFromComponents(components);
    
    // Convert to our internal format
    return {
        name: metaTemplate.name,
        language: metaTemplate.language?.policy === 'deterministic' ? metaTemplate.language.code : metaTemplate.language,
        category: metaTemplate.category,
        components: components,
        variables: variables,
        description: metaTemplate.category // Using category as description if no specific description exists
    };
}

/**
 * Extracts variables from template components
 */
function extractVariablesFromComponents(components) {
    const variables = [];
    
    for (const component of components) {
        if (component.type === 'BODY' && component.text) {
            // Extract placeholders like {{1}}, {{2}}, etc.
            const matches = component.text.match(/\{\{(\d+)\}\}/g);
            if (matches) {
                matches.forEach(match => {
                    const varNum = match.replace(/[{}]/g, '');
                    if (!variables.includes(varNum)) {
                        variables.push(varNum);
                    }
                });
            }
        }
    }
    
    return variables;
}

/**
 * Upserts a template into the database
 */
function upsertTemplate(template) {
    const componentsJson = JSON.stringify(template.components);
    const variablesJson = JSON.stringify(template.variables || []);
    
    db.prepare(`
        INSERT INTO templates (name, category, language, components, variables, description, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(name, language) DO UPDATE SET
            category = excluded.category,
            components = excluded.components,
            variables = excluded.variables,
            description = excluded.description,
            updatedAt = CURRENT_TIMESTAMP
    `).run(
        template.name,
        template.category,
        template.language,
        componentsJson,
        variablesJson,
        template.description || null
    );
}

/**
 * Main sync function
 */
async function syncMetaTemplates() {
    console.log('🔄 Starting Meta template synchronization...');
    
    try {
        // Fetch templates from Meta API
        const metaTemplates = await fetchMetaTemplates();
        
        if (!metaTemplates || metaTemplates.length === 0) {
            console.log('ℹ️ No templates found in Meta API');
            return;
        }
        
        let syncedCount = 0;
        let errorCount = 0;
        
        for (const metaTemplate of metaTemplates) {
            try {
                // Convert to internal format
                const internalTemplate = convertMetaTemplateToInternalFormat(metaTemplate);
                
                // Upsert to database
                upsertTemplate(internalTemplate);
                syncedCount++;
                
                console.log(`✅ Synced template: ${internalTemplate.name} (${internalTemplate.language})`);
            } catch (error) {
                console.error(`❌ Error syncing template ${metaTemplate.name}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Sync Summary:`);
        console.log(`✅ Successfully synced: ${syncedCount}`);
        console.log(`❌ Failed to sync: ${errorCount}`);
        console.log(`📈 Total processed: ${syncedCount + errorCount}`);
        
    } catch (error) {
        console.error('❌ Critical error during sync:', error.message);
        throw error;
    } finally {
        db.close();
    }
}

// Run the sync process if this file is executed directly
if (require.main === module) {
    syncMetaTemplates()
        .then(() => {
            console.log('\n🎉 Meta template synchronization completed successfully!');
        })
        .catch(error => {
            console.error('\n💥 Meta template synchronization failed:', error);
            process.exit(1);
        });
}

module.exports = {
    fetchMetaTemplates,
    convertMetaTemplateToInternalFormat,
    extractVariablesFromComponents,
    syncMetaTemplates
};