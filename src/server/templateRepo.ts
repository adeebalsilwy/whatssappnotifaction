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

export function getTemplateByName(name: string): WhatsAppTemplate | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM templates WHERE name = ?').get(name) as any;

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
    ON CONFLICT(name) DO UPDATE SET
      category = excluded.category,
      language = excluded.language,
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
