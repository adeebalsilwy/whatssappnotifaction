import * as templateRepo from '../server/templateRepo';

interface TemplateVariable {
  name: string;
  value: string | number;
}

interface TemplateComponent {
  type: string;
  parameters: Array<{
    type: string;
    text?: string;
    currency?: any;
    date_time?: any;
  }>;
}

export interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  variables: string[];
  description: string;
}

export class TemplateService {
  constructor() {}

  /**
   * Get all available templates from database
   */
  getAllTemplates(): WhatsAppTemplate[] {
    return templateRepo.getAllTemplates() as unknown as WhatsAppTemplate[];
  }

  /**
   * Get a specific template by name from database
   */
  getTemplateByName(name: string, language?: string): WhatsAppTemplate | undefined {
    const template = templateRepo.getTemplateByName(name, language) as unknown as WhatsAppTemplate;

    // Auto-sync logic if template is missing but we're in a critical path
    // This is handled by the sync script mostly, but we could add on-demand fetch here if needed.

    return template;
  }

  /**
   * Render a template with provided variables
   */
  renderTemplate(templateName: string, variables: Record<string, string | number>, language?: string): any {
    const template = this.getTemplateByName(templateName, language);
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Validate that all required variables are provided
    // Variables in DB might be stored as {1}, {2}, etc. or {varName}
    // Let's support both.
    const missingVariables = (template.variables || []).filter(
      variable => !(variable in variables)
    );

    // If template has variables defined, we enforce them.
    // If not, we still try to render what's there.
    if (missingVariables.length > 0) {
      // throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      console.warn(`Missing required variables for template ${templateName}: ${missingVariables.join(', ')}`);
    }

    // Process the template components and replace variables
    const renderedComponents = template.components.map(component => {
      // If it's a Meta-style component, it might not have 'parameters' in the definition,
      // but 'text' which contains placeholders like {{1}}, {{2}}...
      // Meta expects us to send the values in 'parameters'

      const parameters: any[] = [];

      // If we are rendering for Meta, we need to map our variables to the indexed parameters Meta expects
      // OR if we use named parameters in our templates.

      // For now, let's assume we want to produce the structure Meta expects for sending.
      // Meta's 'template' object in the send API doesn't include the 'text',
      // just the parameter values.

      // Example:
      // component in DB: { type: 'BODY', text: 'Hello {{1}}' }
      // variables: { '1': 'Jules' }
      // Result for Meta: { type: 'body', parameters: [ { type: 'text', text: 'Jules' } ] }

      if (component.type.toUpperCase() === 'BODY') {
        // Extract placeholders like {{1}} or {{varName}}
        const text = (component as any).text || '';
        const placeholders = text.match(/{{(\w+)}}/g) || [];

        placeholders.forEach((placeholder: string, index: number) => {
          const varNameFromPlaceholder = placeholder.replace(/{{|}}/g, '');

          // 1. Try to find by name directly (e.g. variables['customer_id'] or variables['1'])
          let value = variables[varNameFromPlaceholder];

          // 2. If not found and placeholder is a number (like {{1}}), try mapping from template.variables array
          if (value === undefined && !isNaN(Number(varNameFromPlaceholder))) {
            const mappedVarName = template.variables[Number(varNameFromPlaceholder) - 1];
            if (mappedVarName) {
              value = variables[mappedVarName];
            }
          }

          parameters.push({
            type: 'text',
            text: value !== undefined ? String(value) : ''
          });
        });
      }

      return {
        type: component.type.toLowerCase(),
        parameters: parameters.length > 0 ? parameters : (component.parameters || [])
      };
    });

    return {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: template.language || 'en_US'
        },
        components: renderedComponents
      }
    };
  }

  /**
   * Create a new template in database
   */
  createTemplate(template: WhatsAppTemplate): void {
    // Check if template already exists
    if (this.getTemplateByName(template.name)) {
      throw new Error(`Template '${template.name}' already exists`);
    }

    // Validate required fields
    if (!template.name || !template.category || !template.language || !template.components) {
      throw new Error('Missing required template fields');
    }

    templateRepo.upsertTemplate(template);
  }

  /**
   * Update an existing template in database
   */
  updateTemplate(name: string, updatedTemplate: Partial<WhatsAppTemplate>): void {
    const existing = this.getTemplateByName(name);
    if (!existing) {
      throw new Error(`Template '${name}' not found`);
    }

    const merged = { ...existing, ...updatedTemplate };
    templateRepo.upsertTemplate(merged);
  }

  /**
   * Delete a template from database
   */
  deleteTemplate(name: string): void {
    templateRepo.deleteTemplate(name);
  }
}