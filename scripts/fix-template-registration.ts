import axios from 'axios';
import * as fs from 'fs';

/**
 * Fixed WhatsApp Template Registration Script
 * Addresses issues with template registration in Meta's WhatsApp Business API
 */

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  parameters?: any[];
  add_security_recommendation?: boolean;
  code_expiration_minutes?: number;
  buttons?: Array<{
    type: string;
    text?: string;
    otp_type?: string;
    autofill_text?: string;
    package_name?: string;
    signature_hash?: string;
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

/**
 * Fixes and transforms templates to match Meta's API requirements
 * Based on the Postman collection examples
 */
function transformTemplateForMetaAPI(template: WhatsAppTemplate): any {
  const transformedTemplate = {
    name: template.name,
    language: template.language,
    category: template.category,
    components: [] as any[]
  };

  // Process each component in the template
  for (const component of template.components) {
    const transformedComponent: any = {
      type: component.type
    };

    // For BODY components, we need to properly format the parameters
    if (component.type === 'BODY') {
      if (component.parameters) {
        // Create a single body text with variables properly formatted
        const allTextParts: string[] = [];
        
        for (const param of component.parameters) {
          if (param.type === 'text' && param.text) {
            allTextParts.push(param.text);
          }
        }
        
        // Combine all text parts
        const combinedText = allTextParts.join(' ');
        
        // Extract variables from the text and create proper parameters
        const variablePattern = /\{([^}]+)\}/g;
        const matches = [...combinedText.matchAll(variablePattern)];
        
        if (matches.length > 0) {
          // Create a body component without hardcoded text, variables will be passed separately when sending
          transformedComponent.text = combinedText.replace(variablePattern, '{{#variable#}}'); // Placeholder
          transformedComponent.parameters = []; // Parameters are sent when actually sending the message
        } else {
          transformedComponent.text = combinedText;
        }
      }
    } 
    // For HEADER components
    else if (component.type === 'HEADER') {
      transformedComponent.format = 'TEXT'; // Default to text format
      if (component.parameters) {
        for (const param of component.parameters) {
          if (param.type === 'text' && param.text) {
            transformedComponent.text = param.text;
            break; // Take first text parameter
          }
        }
      }
    }
    // For FOOTER components
    else if (component.type === 'FOOTER') {
      if (component.parameters) {
        for (const param of component.parameters) {
          if (param.type === 'text' && param.text) {
            transformedComponent.text = param.text;
            break; // Take first text parameter
          }
        }
      }
    }
    // For BUTTONS components
    else if (component.type === 'BUTTONS') {
      transformedComponent.buttons = component.buttons || [];
    }

    transformedTemplate.components.push(transformedComponent);
  }

  return transformedTemplate;
}

/**
 * Alternative approach: Create template based on the exact Postman example format
 */
function createTemplatePayload(template: WhatsAppTemplate): any {
  // Based on the Postman example for template creation
  const payload: any = {
    name: template.name,
    language: template.language,
    category: template.category,
    components: []
  };

  for (const component of template.components) {
    const newComponent: any = {
      type: component.type
    };

    if (component.type === 'BODY') {
      // For body components, extract variables and convert to proper format
      // Convert {variable_name} to {{1}}, {{2}}, etc.
      if (component.parameters) {
        for (const param of component.parameters) {
          if (param.type === 'text' && param.text) {
            // Extract variables from the text (e.g., {variable_name})
            const variablePattern = /\{([^}]+)\}/g;
            const matches = [...param.text.matchAll(variablePattern)];
            
            if (matches.length > 0) {
              let processedText = param.text;
              const exampleValues = [];
              let variableCounter = 1;
              
              for (const match of matches) {
                const fullMatch = match[0]; // e.g., '{variable_name}'
                const variableName = match[1]; // e.g., 'variable_name'
                processedText = processedText.replace(fullMatch, `{{${variableCounter}}}`);
                // Add a sample value for the example
                exampleValues.push(`مثال_${variableName}`); // Use Arabic placeholder values
                variableCounter++;
              }
              
              newComponent.text = processedText;
              // Add example values as required by the API
              newComponent.example = {
                body_text: [exampleValues]
              };
            } else {
              newComponent.text = param.text;
            }
            break; // Assuming one text parameter per body component
          }
        }
      }
      payload.components.push(newComponent);
    } else if (component.type === 'HEADER') {
      // Header components need format and text
      newComponent.format = component.format || 'TEXT';
      if (component.parameters) {
        for (const param of component.parameters) {
          if (param.type === 'text' && param.text) {
            // Extract variables from header text too
            const variablePattern = /\{([^}]+)\}/g;
            const matches = [...param.text.matchAll(variablePattern)];
            
            if (matches.length > 0) {
              let processedText = param.text;
              const exampleValues = [];
              let variableCounter = 1;
              
              for (const match of matches) {
                const fullMatch = match[0];
                const variableName = match[1];
                processedText = processedText.replace(fullMatch, `{{${variableCounter}}}`);
                exampleValues.push(`مثال_${variableName}`);
                variableCounter++;
              }
              
              newComponent.text = processedText;
              newComponent.example = {
                header_text: [exampleValues]
              };
            } else {
              newComponent.text = param.text;
            }
            break;
          }
        }
      }
      payload.components.push(newComponent);
    } else if (component.type === 'FOOTER') {
      // Footer components need text
      if (component.parameters) {
        for (const param of component.parameters) {
          if (param.type === 'text' && param.text) {
            newComponent.text = param.text;
            break;
          }
        }
      }
      payload.components.push(newComponent);
    } else if (component.type === 'BUTTONS') {
      newComponent.buttons = component.buttons;
      payload.components.push(newComponent);
    } else {
      // For other component types, add parameters if they exist
      if (component.parameters) {
        newComponent.parameters = component.parameters;
      }
      payload.components.push(newComponent);
    }
  }

  return payload;
}

/**
 * Registers a single template with WhatsApp Business API using proper format
 */
async function registerTemplate(
  accessToken: string,
  wabaId: string,
  template: WhatsAppTemplate
): Promise<any> {
  const templateUrl = `https://graph.facebook.com/v24.0/${wabaId}/message_templates`;

  // Use the createTemplatePayload function which follows Meta's API format
  const payload = createTemplatePayload(template);

  try {
    console.log(`Registering template: ${template.name}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(templateUrl, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Template "${template.name}" registered successfully:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error registering template "${template.name}":`, error.response?.data || error.message);
    console.error('Payload that failed:', JSON.stringify(payload, null, 2));
    throw error;
  }
}

/**
 * Reads template configuration from JSON file
 */
function readTemplateConfig(filePath: string): WhatsAppTemplate[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const config = JSON.parse(fileContent);
  return config.whatsapp_templates;
}

/**
 * Registers all templates from the configuration file
 */
export async function registerAllTemplates(
  accessToken: string,
  wabaId: string,
  templateFilePath: string
): Promise<void> {
  console.log('Reading template configuration...');

  const templates = readTemplateConfig(templateFilePath);

  console.log(`Found ${templates.length} templates to register.\n`);

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];

    console.log(`Registering template ${i + 1}/${templates.length}: ${template.name}`);

    try {
      await registerTemplate(accessToken, wabaId, template);
      console.log(`✓ Successfully registered: ${template.name}\n`);

      // Adding delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
    } catch (error) {
      console.error(`✗ Failed to register: ${template.name}`, error);
      // Continue with next template even if one fails
    }
  }

  console.log('Template registration process completed.');
}

/**
 * Validates template structure according to WhatsApp API requirements
 */
function validateTemplate(template: WhatsAppTemplate): boolean {
  const requiredFields = ['name', 'category', 'language', 'components', 'variables'];

  for (const field of requiredFields) {
    if (!template[field as keyof WhatsAppTemplate]) {
      console.error(`Template validation failed: Missing required field "${field}" in template "${template.name}"`);
      return false;
    }
  }

  // Validate name format (only alphanumeric, underscore, hyphen)
  if (!/^[a-zA-Z0-9_\-]+$/.test(template.name)) {
    console.error(`Template validation failed: Invalid name format "${template.name}". Only alphanumeric, underscore, and hyphen allowed.`);
    return false;
  }

  // Validate category
  const validCategories = ['MARKETING', 'TRANSACTIONAL', 'AUTHENTICATION', 'UTILITY', 'OTP', 'ACCOUNT_UPDATE', 'PAYMENT_UPDATE', 'PERSONAL_FINANCE_UPDATE', 'RESERVATION_UPDATE', 'ISSUE_RESOLUTION', 'APPOINTMENT_UPDATE', 'TRANSPORTATION_UPDATE'];
  if (!validCategories.includes(template.category)) {
    console.error(`Template validation failed: Invalid category "${template.category}" in template "${template.name}". Valid categories: ${validCategories.join(', ')}`);
    return false;
  }

  // Validate language
  if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(template.language)) {
    console.error(`Template validation failed: Invalid language code "${template.language}" in template "${template.name}"`);
    return false;
  }

  // Validate components
  if (!Array.isArray(template.components) || template.components.length === 0) {
    console.error(`Template validation failed: Components must be a non-empty array in template "${template.name}"`);
    return false;
  }

  return true;
}

/**
 * Validates all templates in the configuration file
 */
export function validateAllTemplates(templateFilePath: string): boolean {
  console.log('Validating template configuration...');

  const templates = readTemplateConfig(templateFilePath);
  let allValid = true;

  for (const template of templates) {
    if (!validateTemplate(template)) {
      allValid = false;
    }
  }

  if (allValid) {
    console.log('✓ All templates passed validation.');
  } else {
    console.log('✗ Some templates failed validation.');
  }

  return allValid;
}

/**
 * Main function to register templates
 */
async function main() {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const WABA_ID = process.env.WABA_ID || '';
  const TEMPLATE_FILE_PATH = process.env.TEMPLATE_FILE_PATH || './src/config/whatsapp-professional-templates.json';

  if (!ACCESS_TOKEN || !WABA_ID) {
    console.error('Missing required environment variables: WHATSAPP_ACCESS_TOKEN and WABA_ID');
    console.log('Please set these environment variables:');
    console.log('- WHATSAPP_ACCESS_TOKEN: Your WhatsApp Business API access token');
    console.log('- WABA_ID: Your WhatsApp Business Account ID');
    console.log('- TEMPLATE_FILE_PATH: Path to your template configuration file (optional, defaults to ./src/config/whatsapp-professional-templates.json)');
    return;
  }

  console.log('Starting WhatsApp template registration process...\n');

  // First validate all templates
  if (!validateAllTemplates(TEMPLATE_FILE_PATH)) {
    console.log('\nTemplate validation failed. Please fix the errors before proceeding with registration.');
    return;
  }

  try {
    await registerAllTemplates(ACCESS_TOKEN, WABA_ID, TEMPLATE_FILE_PATH);
    console.log('\nTemplate registration completed successfully!');
  } catch (error) {
    console.error('\nTemplate registration failed:', error);
  }
}

// If this file is run directly, execute the main function
if (require.main === module) {
  main().catch(console.error);
}

export default registerAllTemplates;