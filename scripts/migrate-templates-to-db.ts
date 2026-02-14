import * as fs from 'fs';
import * as path from 'path';
import { upsertTemplate } from '../src/server/templateRepo';

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
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found: ${fileName}`);
            continue;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            const templates = data.whatsapp_templates || data.templates || [];

            console.log(`📄 Processing ${fileName} (${templates.length} templates)...`);

            for (const t of templates) {
                // Map fields to our WhatsAppTemplate interface
                const template = {
                    name: t.name,
                    category: t.category,
                    language: t.language,
                    components: t.components,
                    variables: t.variables || extractVariables(t.components),
                    description: t.description || ''
                };

                upsertTemplate(template);
                totalMigrated++;
            }
        } catch (error) {
            console.error(`❌ Error processing ${fileName}:`, error);
        }
    }

    console.log(`✅ Migration complete! Total templates in DB: ${totalMigrated}`);
}

function extractVariables(components: any[]): string[] {
    const variables = new Set<string>();
    for (const component of components) {
        const text = component.text || '';
        const matches = text.match(/{{(\w+)}}/g) || [];
        matches.forEach((m: string) => variables.add(m.replace(/{{|}}/g, '')));
    }
    return Array.from(variables);
}

if (require.main === module) {
    migrate().catch(console.error);
}
