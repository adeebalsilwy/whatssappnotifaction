/**
 * WhatsApp Template Sending Script
 * Sends template-based messages to avoid restrictions
 */

import axios from 'axios';

interface TemplateParameter {
  type: string;
  text?: string;
}

interface TemplateComponent {
  type: string;
  parameters?: TemplateParameter[];
}

interface TemplateMessage {
  name: string;
  language: {
    code: string;
  };
  components?: TemplateComponent[];
}

interface SendMessagePayload {
  messaging_product: string;
  to: string;
  type: string;
  template: TemplateMessage;
}

class WhatsAppTemplateSender {
  private accessToken: string;
  private phoneNumberId: string;
  private apiUrl: string;

  constructor(accessToken: string, phoneNumberId: string, apiUrl: string = 'https://graph.facebook.com/v18.0') {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.apiUrl = apiUrl;
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(to: string, template: TemplateMessage): Promise<any> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
    
    const payload: SendMessagePayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Template message sent successfully to ${to}!`);
      console.log('Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error sending template message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send OTP code template
   */
  async sendOtpCode(to: string, otpCode: string, expiryTime: string): Promise<any> {
    const template: TemplateMessage = {
      name: 'otp_code',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: otpCode },
            { type: 'text', text: expiryTime }
          ]
        }
      ]
    };

    return this.sendTemplateMessage(to, template);
  }

  /**
   * Send transaction alert template
   */
  async sendTransactionAlert(to: string, accountNumber: string, amount: string, balance: string, timestamp: string): Promise<any> {
    const template: TemplateMessage = {
      name: 'transaction_alert',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: accountNumber },
            { type: 'text', text: amount },
            { type: 'text', text: balance },
            { type: 'text', text: timestamp }
          ]
        }
      ]
    };

    return this.sendTemplateMessage(to, template);
  }

  /**
   * Send Arabic transaction alert template
   */
  async sendArabicTransactionAlert(to: string, accountNumber: string, amount: string, balance: string, timestamp: string): Promise<any> {
    const template: TemplateMessage = {
      name: 'transaction_alert_ar',
      language: { code: 'ar_AR' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: accountNumber },
            { type: 'text', text: amount },
            { type: 'text', text: balance },
            { type: 'text', text: timestamp }
          ]
        }
      ]
    };

    return this.sendTemplateMessage(to, template);
  }

  /**
   * Send marketing promotion template
   */
  async sendMarketingPromotion(to: string, productName: string, discountPercentage: string, offerEndDate: string): Promise<any> {
    const template: TemplateMessage = {
      name: 'marketing_promotion',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: productName },
            { type: 'text', text: discountPercentage },
            { type: 'text', text: offerEndDate }
          ]
        }
      ]
    };

    return this.sendTemplateMessage(to, template);
  }
}

async function main() {
  console.log('🚀 WhatsApp Template Message Sender\n');

  // Get environment variables
  const accessToken = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_NUMBER_ID;
  const apiUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';

  if (!accessToken || !phoneNumberId) {
    console.error('❌ Required environment variables not set!');
    console.error('Please set META_WHATSAPP_TOKEN and META_WHATSAPP_NUMBER_ID');
    process.exit(1);
  }

  const sender = new WhatsAppTemplateSender(accessToken, phoneNumberId, apiUrl);

  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  const recipient = args[1];

  if (!recipient) {
    console.error('❌ Recipient phone number is required!');
    console.log('Usage: npm run send-template <recipient-phone-number> [template-type] [param1] [param2] ...');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'otp':
        const otpCode = args[2] || '123456';
        const expiryTime = args[3] || '10 minutes';
        console.log(`📝 Sending OTP code to ${recipient}...\n`);
        await sender.sendOtpCode(recipient, otpCode, expiryTime);
        break;

      case 'transaction':
        const accountNumber = args[2] || 'XXXX-XXXX-XXXX-1234';
        const amount = args[3] || '$50.00';
        const balance = args[4] || '$1,250.75';
        const timestamp = args[5] || '2024-01-15 10:30 AM';
        console.log(`📝 Sending transaction alert to ${recipient}...\n`);
        await sender.sendTransactionAlert(recipient, accountNumber, amount, balance, timestamp);
        break;

      case 'transaction-ar':
        const arAccountNumber = args[2] || 'XXXX-XXXX-XXXX-1234';
        const arAmount = args[3] || '50.00 ريال';
        const arBalance = args[4] || '1,250.75 ريال';
        const arTimestamp = args[5] || '15 يناير 2024 10:30 صباحاً';
        console.log(`📝 Sending Arabic transaction alert to ${recipient}...\n`);
        await sender.sendArabicTransactionAlert(recipient, arAccountNumber, arAmount, arBalance, arTimestamp);
        break;

      case 'marketing':
        const productName = args[2] || 'Premium Product';
        const discount = args[3] || '25%';
        const endDate = args[4] || 'Dec 31, 2024';
        console.log(`📝 Sending marketing promotion to ${recipient}...\n`);
        await sender.sendMarketingPromotion(recipient, productName, discount, endDate);
        break;

      default:
        console.log('📋 Available commands:');
        console.log('  otp <to> [code] [expiry]    - Send OTP code template');
        console.log('  transaction <to> [acct] [amt] [bal] [time] - Send transaction alert');
        console.log('  transaction-ar <to> [acct] [amt] [bal] [time] - Send Arabic transaction alert');
        console.log('  marketing <to> [product] [disc] [end] - Send marketing promotion');
        console.log('\nUsage: npm run send-template [command] <recipient-phone-number> [params...]');
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