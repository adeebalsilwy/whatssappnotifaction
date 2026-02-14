import axios from 'axios';
import * as fs from 'fs';

interface Component {
  type: string;
  text?: string;
  format?: string;
  example?: any;
  buttons?: any[];
}

interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  components: Component[];
  description: string;
}

interface TemplateConfig {
  whatsapp_templates: WhatsAppTemplate[];
}

async function registerArabicTemplates() {
  try {
    // Load the Arabic templates from the configuration file
    const templateData: TemplateConfig = JSON.parse(
      fs.readFileSync('./src/config/whatsapp-comprehensive-arabic-templates.json', 'utf8')
    );

    // Try multiple environment variable names for access token
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 
                       process.env.META_WHATSAPP_TOKEN ||
                       process.env.WHATSAPP_PERMANENT_TOKEN;
    
    // Try multiple environment variable names for WABA ID
    const wabaId = process.env.WABA_ID || 
                   process.env.META_WHATSAPP_NUMBER_ID ||
                   process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    
    const version = process.env.API_VERSION || 'v18.0';

    if (!accessToken || !wabaId) {
      console.error('Missing required environment variables:');
      console.log('  Access Token: WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_TOKEN, or WHATSAPP_PERMANENT_TOKEN');
      console.log('  WABA ID: WABA_ID, META_WHATSAPP_NUMBER_ID, or WHATSAPP_BUSINESS_ACCOUNT_ID');
      console.log('\nCurrent environment values:');
      console.log(`  WHATSAPP_ACCESS_TOKEN: ${process.env.WHATSAPP_ACCESS_TOKEN ? '[SET]' : '[NOT SET]'}`);
      console.log(`  META_WHATSAPP_TOKEN: ${process.env.META_WHATSAPP_TOKEN ? '[SET]' : '[NOT SET]'}`);
      console.log(`  WABA_ID: ${process.env.WABA_ID ? '[SET]' : '[NOT SET]'}`);
      console.log(`  META_WHATSAPP_NUMBER_ID: ${process.env.META_WHATSAPP_NUMBER_ID ? '[SET]' : '[NOT SET]'}`);
      return;
    }

    console.log(`Registering ${templateData.whatsapp_templates.length} Arabic templates...`);
    console.log(`Using WABA ID: ${wabaId}`);
    console.log(`Access token length: ${accessToken.length} characters`);
    console.log(`Access token starts with: ${accessToken.substring(0, 50)}...`);

    // Test the token first
    console.log('\nTesting access token validity...');
    try {
      const testResponse = await axios.get(
        `https://graph.facebook.com/${version}/${wabaId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log('✓ Token validation successful');
      console.log(`Account info: ${JSON.stringify(testResponse.data, null, 2)}`);
    } catch (testError: any) {
      console.error('✗ Token validation failed:');
      if (testError.response) {
        console.error(`  Status: ${testError.response.status}`);
        console.error(`  Data:`, testError.response.data);
      } else {
        console.error(`  Error:`, testError.message);
      }
      console.log('\nPlease verify your token is correct and has the required permissions:');
      console.log('- whatsapp_business_management');
      console.log('- whatsapp_business_messaging');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const template of templateData.whatsapp_templates) {
      console.log(`\nRegistering template: ${template.name}`);

      try {
        const response = await axios.post(
          `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
          {
            name: template.name,
            language: template.language,
            category: template.category,
            components: template.components,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`✓ Template ${template.name} registered successfully`);
        console.log(`  Response:`, response.data);
        successCount++;
      } catch (error: any) {
        console.error(`✗ Failed to register template ${template.name}:`);
        if (error.response) {
          console.error(`  Status: ${error.response.status}`);
          console.error(`  Data:`, error.response.data);
          if (error.response.data.error) {
            console.error(`  Error Code: ${error.response.data.error.code}`);
            console.error(`  Error Message: ${error.response.data.error.message}`);
          }
        } else {
          console.error(`  Error:`, error.message);
        }
        failureCount++;
      }
    }

    console.log('\n--- Registration Summary ---');
    console.log(`Total templates processed: ${templateData.whatsapp_templates.length}`);
    console.log(`Successfully registered: ${successCount}`);
    console.log(`Failed registrations: ${failureCount}`);
    
    if (failureCount > 0) {
      console.log('\nCommon issues and solutions:');
      console.log('1. Check if your token has the required permissions');
      console.log('2. Verify the WABA ID is correct');
      console.log('3. Ensure your app is properly configured in Meta Developers Portal');
      console.log('4. Check if there are any rate limiting issues');
    }
    
    console.log('\nAll Arabic templates registration process completed!');
  } catch (error) {
    console.error('Error registering Arabic templates:', error);
  }
}

// Run the registration process
if (require.main === module) {
  registerArabicTemplates();
}