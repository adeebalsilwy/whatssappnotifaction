import axios from 'axios';

async function testWithNewToken() {
  // Replace this with your actual new token
  const NEW_TOKEN = process.env.NEW_WHATSAPP_TOKEN || "YOUR_ACTUAL_NEW_TOKEN_HERE";
  
  const wabaId = "1398033981696517";
  const version = "v18.0";

  if (NEW_TOKEN === "YOUR_ACTUAL_NEW_TOKEN_HERE" || !NEW_TOKEN) {
    console.log("Please provide your new token by setting the NEW_WHATSAPP_TOKEN environment variable");
    console.log("Example: $env:NEW_WHATSAPP_TOKEN='your_actual_new_token_here'");
    console.log("Or replace the NEW_TOKEN variable in this script with your actual token");
    return;
  }

  console.log("Testing with your new token...");
  console.log(`Token length: ${NEW_TOKEN.length} characters`);

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${version}/${wabaId}`,
      {
        headers: {
          Authorization: `Bearer ${NEW_TOKEN}`,
        },
      }
    );
    console.log('✓ New token is working!');
    console.log(`Account data: ${JSON.stringify(response.data, null, 2)}`);
    
    // If the token works, let's try registering a template
    console.log('\nTesting template registration with new token...');
    const templateResponse = await axios.post(
      `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
      {
        name: `test_template_${Date.now()}`,
        language: 'en',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: 'Test template created with new token at {{1}}',
            example: {
              body_text: [[new Date().toISOString()]]
            }
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${NEW_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✓ Template registration successful with new token!');
    console.log(`Response:`, templateResponse.data);
    
  } catch (error: any) {
    console.error('✗ New token test failed:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, error.response.data);
    } else {
      console.error(`  Error:`, error.message);
    }
  }
}

if (require.main === module) {
  testWithNewToken();
}