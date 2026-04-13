import { getDb } from './db';

export interface WhatsAppTemplate {
  id?: number;
  name: string;
  category: string;
  language: string;
  components: any;
  variables?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getAllTemplates(): WhatsAppTemplate[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM templates').all() as any[];
  
  return rows.map(row => ({
    ...row,
    components: JSON.parse(row.components),
    variables: row.variables ? JSON.parse(row.variables) : []
  }));
}

export function getTemplateByName(name: string, language?: string): WhatsAppTemplate | undefined {
  const db = getDb();
  let row: any;
  
  if (language) {
    row = db.prepare('SELECT * FROM templates WHERE name = ? AND language = ?').get(name, language);
  } else {
    // Default to 'ar' then any available
    row = db.prepare("SELECT * FROM templates WHERE name = ? ORDER BY CASE WHEN language = 'ar' THEN 0 ELSE 1 END LIMIT 1").get(name);
  }
  
  if (!row) return undefined;
  
  return {
    ...row,
    components: JSON.parse(row.components),
    variables: row.variables ? JSON.parse(row.variables) : []
  };
}

export function upsertTemplate(template: WhatsAppTemplate): void {
  const db = getDb();
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

export function deleteTemplate(name: string): void {
  const db = getDb();
  db.prepare('DELETE FROM templates WHERE name = ?').run(name);
}