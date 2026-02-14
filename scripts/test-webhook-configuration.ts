/**
 * WhatsApp Webhook Configuration Test Script
 * Validates webhook setup and verifies token configuration
 */

import axios from 'axios';

class WebhookTester {
  private verifyToken: string;
  private apiUrl: string;

  constructor(verifyToken: string, apiUrl: string = 'https://apinotification.firstaden-bank.com') {
    this.verifyToken = verifyToken;
    this.apiUrl = apiUrl;
  }

  /**
   * Test webhook verification endpoint
   */
  async testVerification(): Promise<any> {
    const testUrl = `${this.apiUrl}/api/webhooks/meta`;
    
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': this.verifyToken,
      'hub.challenge': 'test-challenge'
    });

    try {
      const response = await axios.get(testUrl, {
        params,
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ Webhook verification test successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Webhook verification test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Test webhook endpoint with mock inbound message
   */
  async testInboundMessage(mockMessage: any): Promise<any> {
    const testUrl = `${this.apiUrl}/api/webhooks/meta`;

    try {
      const response = await axios.post(testUrl, mockMessage, {
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=test-signature' // This would be computed in real scenario
        },
        timeout: 10000
      });

      console.log('✅ Inbound message test successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Inbound message test failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Test webhook endpoint with mock status update
   */
  async testStatusUpdate(mockStatus: any): Promise<any> {
    const testUrl = `${this.apiUrl}/api/webhooks/meta`;

    try {
      const response = await axios.post(testUrl, mockStatus, {
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=test-signature' // This would be computed in real scenario
        },
        timeout: 10000
      });

      console.log('✅ Status update test successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Status update test failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('🚀 WhatsApp Webhook Configuration Tester\n');

  // Get environment variables
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  const apiUrl = process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com';

  if (!verifyToken) {
    console.error('❌ Required environment variable not set!');
    console.error('Please set META_WEBHOOK_VERIFY_TOKEN');
    process.exit(1);
  }

  const tester = new WebhookTester(verifyToken, apiUrl);

  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  try {
    switch (command) {
      case 'verify':
        console.log('📝 Testing webhook verification...\n');
        await tester.testVerification();
        break;

      case 'inbound':
        console.log('📝 Testing inbound message webhook...\n');
        const mockInbound = {
          "object": "whatsapp_business_account",
          "entry": [{
            "id": "1234567890",
            "changes": [{
              "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                  "display_phone_number": "+1 123-456-7890",
                  "phone_number_id": "0987654321"
                },
                "contacts": [{
                  "profile": {
                    "name": "Test User"
                  },
                  "wa_id": "16315551234"
                }],
                "messages": [{
                  "id": "wamid.testmessageid",
                  "from": "16315551234",
                  "timestamp": "1624496825",
                  "text": {
                    "body": "Test message from user"
                  },
                  "type": "text"
                }]
              },
              "field": "messages"
            }]
          }]
        };
        await tester.testInboundMessage(mockInbound);
        break;

      case 'status':
        console.log('📝 Testing status update webhook...\n');
        const mockStatus = {
          "object": "whatsapp_business_account",
          "entry": [{
            "id": "1234567890",
            "changes": [{
              "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                  "display_phone_number": "+1 123-456-7890",
                  "phone_number_id": "0987654321"
                },
                "statuses": [{
                  "id": "wamid.externalmessageid",
                  "status": "delivered",
                  "timestamp": "1624496825",
                  "recipient_id": "16315551234"
                }]
              },
              "field": "messages"
            }]
          }]
        };
        await tester.testStatusUpdate(mockStatus);
        break;

      default:
        console.log('📋 Available commands:');
        console.log('  verify  - Test webhook verification endpoint');
        console.log('  inbound - Test inbound message endpoint');
        console.log('  status  - Test message status endpoint');
        console.log('\nUsage: npm run test-webhook [command]');
        break;
    }
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}