import whatsapp_templates from '../config/whatsapp-arabic-templates.json';

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

interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  variables: string[];
  description: string;
}

export class TemplateService {
  private templates: WhatsAppTemplate[];

  constructor() {
    this.templates = (whatsapp_templates as any).whatsapp_templates;
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): WhatsAppTemplate[] {
    return this.templates;
  }

  /**
   * Get a specific template by name
   */
  getTemplateByName(name: string): WhatsAppTemplate | undefined {
    return this.templates.find(template => template.name === name);
  }

  /**
   * Render a template with provided variables
   */
  renderTemplate(templateName: string, variables: Record<string, string | number>): any {
    const template = this.getTemplateByName(templateName);
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Validate that all required variables are provided
    const missingVariables = template.variables.filter(
      variable => !(variable in variables)
    );

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Process the template components and replace variables
    const renderedComponents = template.components.map(component => {
      const renderedParams = component.parameters.map(param => {
        if (param.text) {
          // Replace variables in the text
          let newText = param.text;
          for (const [varName, varValue] of Object.entries(variables)) {
            newText = newText.replace(new RegExp(`{${varName}}`, 'g'), String(varValue));
          }
          return { ...param, text: newText };
        }
        return param;
      });

      return {
        ...component,
        parameters: renderedParams
      };
    });

    return {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: template.language
        },
        components: renderedComponents
      }
    };
  }

  /**
   * Create a new template
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

    this.templates.push(template);
  }

  /**
   * Update an existing template
   */
  updateTemplate(name: string, updatedTemplate: Partial<WhatsAppTemplate>): void {
    const index = this.templates.findIndex(template => template.name === name);
    if (index === -1) {
      throw new Error(`Template '${name}' not found`);
    }

    // Preserve the original name if not provided in update
    if (!updatedTemplate.name) {
      updatedTemplate.name = name;
    }

    this.templates[index] = { ...this.templates[index], ...updatedTemplate } as WhatsAppTemplate;
  }

  /**
   * Delete a template
   */
  deleteTemplate(name: string): void {
    const initialLength = this.templates.length;
    this.templates = this.templates.filter(template => template.name !== name);

    if (this.templates.length === initialLength) {
      throw new Error(`Template '${name}' not found`);
    }
  }
}