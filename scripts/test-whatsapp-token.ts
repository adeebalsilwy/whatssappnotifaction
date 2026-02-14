import axios from 'axios';

async function testWhatsAppToken() {
  try {
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

    console.log('Testing WhatsApp API access...');
    console.log(`WABA ID: ${wabaId}`);
    console.log(`Token length: ${accessToken.length} characters`);
    
    // Test 1: Basic account info
    console.log('\n1. Testing basic account access...');
    try {
      const accountResponse = await axios.get(
        `https://graph.facebook.com/${version}/${wabaId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log('✓ Account access successful');
      console.log(`Account data: ${JSON.stringify(accountResponse.data, null, 2)}`);
    } catch (error: any) {
      console.error('✗ Account access failed:');
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data:`, error.response.data);
      } else {
        console.error(`  Error:`, error.message);
      }
      return;
    }

    // Test 2: List existing templates
    console.log('\n2. Testing template listing...');
    try {
      const templatesResponse = await axios.get(
        `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log('✓ Template listing successful');
      console.log(`Existing templates: ${templatesResponse.data.data?.length || 0} found`);
      if (templatesResponse.data.data && templatesResponse.data.data.length > 0) {
        console.log('First few templates:');
        templatesResponse.data.data.slice(0, 3).forEach((template: any) => {
          console.log(`  - ${template.name} (${template.status})`);
        });
      }
    } catch (error: any) {
      console.error('✗ Template listing failed:');
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data:`, error.response.data);
      } else {
        console.error(`  Error:`, error.message);
      }
    }

    // Test 3: Try to create a simple test template
    console.log('\n3. Testing template creation...');
    const testTemplateName = `test_template_${Date.now()}`;
    try {
      const createResponse = await axios.post(
        `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
        {
          name: testTemplateName,
          language: 'en',
          category: 'UTILITY',
          components: [
            {
              type: 'BODY',
              text: 'This is a test template created at {{1}}',
              example: {
                body_text: [[new Date().toISOString()]]
              }
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✓ Template creation successful');
      console.log(`Response:`, createResponse.data);
      
      // Clean up - delete the test template
      if (createResponse.data.id) {
        try {
          await axios.delete(
            `https://graph.facebook.com/${version}/${createResponse.data.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          console.log('✓ Test template cleaned up successfully');
        } catch (deleteError) {
          console.log('Note: Could not delete test template (this is normal if it was auto-approved)');
        }
      }
    } catch (error: any) {
      console.error('✗ Template creation failed:');
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
    }

    console.log('\n--- Token Test Summary ---');
    console.log('If all tests passed, your token is working correctly.');
    console.log('If some tests failed, check the error messages above for specific issues.');

  } catch (error) {
    console.error('Error testing WhatsApp token:', error);
  }
}

// Run the test
if (require.main === module) {
  testWhatsAppToken();
}