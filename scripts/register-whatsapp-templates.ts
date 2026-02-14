import axios from 'axios';

interface TemplateParameter {
  type: string;
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

interface TemplateComponent {
  type: 'BODY';
  parameters: TemplateParameter[];
}

interface TemplateMessage {
  name: string;
  language: {
    policy: string;
    code: string;
  };
  components: TemplateComponent[];
}

interface TemplateRegistrationResponse {
  success: boolean;
  message?: string;
  error?: string;
  templateId?: string;
}

class WhatsAppTemplateRegistrar {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.baseUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.META_WHATSAPP_TOKEN || '';
    this.phoneNumberId = process.env.META_WHATSAPP_NUMBER_ID || '';

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Missing required Meta WhatsApp API credentials. Please set META_WHATSAPP_TOKEN and META_WHATSAPP_NUMBER_ID environment variables.');
    }
  }

  /**
   * Register a new WhatsApp template
   */
  async registerTemplate(template: TemplateMessage): Promise<TemplateRegistrationResponse> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/message_templates`;
      
      const response = await axios.post(url, {
        ...template,
        category: 'TRANSACTIONAL' // Templates for financial services should be transactional
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'Template registered successfully',
        templateId: response.data.id
      };
    } catch (error: any) {
      console.error('Error registering template:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Get list of existing templates
   */
  async getTemplates(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/message_templates`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching templates:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Delete a template by name
   */
  async deleteTemplate(templateName: string): Promise<TemplateRegistrationResponse> {
    try {
      const url = `${this.baseUrl}/${templateName}`;
      
      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        data: {
          permanently_delete: true
        }
      });

      return {
        success: true,
        message: `Template ${templateName} deleted successfully`
      };
    } catch (error: any) {
      console.error('Error deleting template:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Create a standard OTP template
   */
  createOtpTemplate(): TemplateMessage {
    return {
      name: 'otp_template',
      language: {
        policy: 'deterministic',
        code: 'en_US'
      },
      components: [{
        type: 'BODY',
        parameters: [
          {
            type: 'text',
            text: '123456'
          },
          {
            type: 'text',
            text: '10 minutes'
          }
        ]
      }]
    };
  }

  /**
   * Create a standard transaction alert template
   */
  createTransactionTemplate(): TemplateMessage {
    return {
      name: 'transaction_alert',
      language: {
        policy: 'deterministic',
        code: 'en_US'
      },
      components: [{
        type: 'BODY',
        parameters: [
          {
            type: 'text',
            text: '$100.00'
          },
          {
            type: 'text',
            text: '****1234'
          },
          {
            type: 'date_time',
            date_time: {
              fallback_value: '2023-12-01T10:00:00+05:30'
            }
          }
        ]
      }]
    };
  }

  /**
   * Create a standard marketing promotion template
   */
  createMarketingTemplate(): TemplateMessage {
    return {
      name: 'marketing_promo',
      language: {
        policy: 'deterministic',
        code: 'en_US'
      },
      components: [{
        type: 'BODY',
        parameters: [
          {
            type: 'text',
            text: '20% OFF'
          },
          {
            type: 'text',
            text: 'Premium Services'
          },
          {
            type: 'text',
            text: 'Dec 31, 2024'
          }
        ]
      }]
    };
  }
}

async function runTemplateRegistration() {
  console.log('🔐 Checking Meta WhatsApp API credentials...');
  
  const registrar = new WhatsAppTemplateRegistrar();
  
  console.log('📋 Fetching existing templates...');
  const existingTemplates = await registrar.getTemplates();
  console.log(`Found ${existingTemplates.length} existing templates:`);
  existingTemplates.forEach(template => {
    console.log(`  - ${template.name} (${template.category}) - Status: ${template.status}`);
  });
  console.log('');

  // Define templates to register
  const templatesToRegister = [
    registrar.createOtpTemplate(),
    registrar.createTransactionTemplate(),
    registrar.createMarketingTemplate()
  ];

  console.log('📤 Registering templates...');
  for (const template of templatesToRegister) {
    console.log(`Registering template: ${template.name}`);
    
    // Check if template already exists
    const existing = existingTemplates.find(t => t.name === template.name);
    if (existing) {
      console.log(`⚠️  Template ${template.name} already exists with status: ${existing.status}`);
      continue;
    }

    const result = await registrar.registerTemplate(template);
    if (result.success) {
      console.log(`✅ Template ${template.name} registered successfully`);
    } else {
      console.log(`❌ Failed to register template ${template.name}: ${result.error}`);
    }
    console.log('');
  }

  console.log('🎯 Template registration process completed!');
  console.log('These templates will enable compliant messaging through WhatsApp Business API');
}

// Run the registration if this file is executed directly
if (require.main === module) {
  runTemplateRegistration().catch(console.error);
}

export { WhatsAppTemplateRegistrar };
export type { TemplateMessage, TemplateRegistrationResponse };