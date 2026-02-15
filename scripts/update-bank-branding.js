const Database = require('better-sqlite3');
const path = require('path');

/**
 * One-time script to update bank branding in existing templates.
 * Replaces "إشعار من البنك" with "بنك عدن الأول الإسلامي" in all template components.
 */

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');
const db = new Database(dbPath);

async function updateBranding() {
    console.log('🏦 Starting bank branding update in database...');

    try {
        const templates = db.prepare('SELECT id, name, language, components FROM templates').all();
        let updateCount = 0;

        for (const template of templates) {
            let components = JSON.parse(template.components);
            let changed = false;

            components = components.map(comp => {
                if (comp.text && comp.text.includes('إشعار من البنك')) {
                    comp.text = comp.text.replace(/إشعار من البنك/g, 'بنك عدن الأول الإسلامي');
                    changed = true;
                }
                return comp;
            });

            if (changed) {
                db.prepare('UPDATE templates SET components = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(JSON.stringify(components), template.id);
                updateCount++;
                console.log(`✅ Updated branding for template: ${template.name} (${template.language})`);
            }
        }

        console.log(`✨ Branding update complete! Total templates updated: ${updateCount}`);
    } catch (error) {
        console.error('❌ Error updating branding:', error.message);
    } finally {
        db.close();
    }
}

updateBranding().catch(console.error);
