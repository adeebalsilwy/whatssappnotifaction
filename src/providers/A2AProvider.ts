import type { IWhatsAppProvider } from '@/providers/IWhatsAppProvider';
import type { OutgoingMessagePayload, ProviderResult, AppConfig, ProviderConfig } from '@/lib/types';
import axios from 'axios';
import * as https from 'https';
import { logToFile } from '@/lib/logger';
import { loadA2AConfig, validateA2AConfig } from '@/lib/a2a-config';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';

/**
 * A2A Provider for fetching notifications from A2A system and sending SMS messages
 */
export class A2AProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    try {
      // This provider is for fetching A2A notifications, not sending WhatsApp messages
      // So we'll handle A2A-specific functionality here
      
      // Load A2A config from environment variables (check for mode in environment first)
      const envMode: 'live' | 'test' = (process.env.A2A_MODE === 'test' ? 'test' : 'live'); // Check environment variable first
      const a2aConfig = loadA2AConfig(envMode); // Use live/test mode based on environment
      
      if (!validateA2AConfig(a2aConfig)) {
        return {
          success: false,
          provider: 'a2a' as any,
          rawResponse: { error: 'A2A provider configuration is invalid' },
          errorCode: 'CONFIG_INVALID',
          errorMessage: 'A2A provider configuration is invalid',
        };
      }

      // Fetch A2A notifications
      const notifications = await this.fetchA2ANotifications(a2aConfig, envMode);
      
      // Process notifications and send SMS
      const processedCount = await this.processNotifications(notifications, a2aConfig, envMode);
      
      return {
        success: true,
        provider: 'a2a' as any,
        rawResponse: { processedCount, notifications },
        metadata: {
          processedNotifications: processedCount,
          totalNotifications: notifications.length
        }
      };
    } catch (error: any) {
      console.error('A2A Provider Error:', error);
      
      return {
        success: false,
        provider: 'a2a' as any,
        rawResponse: { error: error.message },
        errorCode: 'A2A_ERROR',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Fetch A2A notifications from the API server
   */
  private async fetchA2ANotifications(config: any, mode: string = 'live'): Promise<any[]> {
    const a2aRequest = {
      a2ARequest: {
        header: {
          connectorID: config.connectorID || "EN",
          srvID: config.srvID || "1",
          UserID: config.userId || config.UserID || "User",
          Password: config.password || config.Password || "123",
          channel: config.channel || "MW",
          BankCode: config.bankCodeHeader || "A2A"
        },
        body: {
          BankCode: config.bankCode || "1030200",
          Sender: config.sender || "FADBank"
        },
        footer: {
          signature: null 
        }
      }
    };

    try {
      const response = await axios.post(
        `https://${config.host || 'A2A-SMS-CONNECTOR.mepspay.com'}:${config.port || 9312}${config.apiUrl || '/wsGetMailsNotification/API/A2A/GetbankNotificationsList'}`,
        a2aRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          // Disable SSL verification if needed (only for development)
          httpsAgent: process.env.NODE_ENV === 'development' ? new https.Agent({ rejectUnauthorized: false }) : undefined
        }
      );

      // Log the A2A fetch operation using an existing log category
      await logToFile('messages', {
        timestamp: new Date().toISOString(),
        action: 'A2A_FETCH_NOTIFICATIONS',
        status: 'SUCCESS',
        request: a2aRequest,
        response: response.data,
        mode: mode
      });

      const notifications = response.data.a2AResponse?.body?.ltsNotifications || [];
      return notifications;
    } catch (error: any) {
      console.error('Error fetching A2A notifications:', error);
      
      // Log the error using an existing log category
      await logToFile('messages', {
        timestamp: new Date().toISOString(),
        action: 'A2A_FETCH_NOTIFICATIONS',
        status: 'ERROR',
        error: error.message,
        request: a2aRequest,
        mode: mode
      });

      throw error;
    }
  }

  /**
   * Process fetched notifications and send WhatsApp messages
   */
  private async processNotifications(notifications: any[], config: any, mode: string = 'live'): Promise<number> {
    if (!notifications || notifications.length === 0) {
      console.log('No A2A notifications to process');
      return 0;
    }

    let processedCount = 0;
    const whatsappService = new WhatsAppNotificationService();

    for (const notification of notifications) {
      try {
        // Prepare WhatsApp message payload
        const payload = {
          to: notification.MsgMobNo,
          body: notification.MsgText,
          messageType: 'TEXT' as const,
          provider: 'meta' as const, // Use the primary WhatsApp provider
          meta: {
            sourceSystem: 'A2A',
            txnId: `a2a-${Date.now()}-${notification.Seq}`,
            eventType: 'OTHER' as const,
          }
        };

        // Send message via WhatsApp
        const result = await whatsappService.send(payload);
        processedCount++;

        // Log successful WhatsApp send using an existing log category
        await logToFile('messages', {
          timestamp: new Date().toISOString(),
          action: 'A2A_WHATSAPP_SENT',
          status: result.success ? 'SUCCESS' : 'FAILED',
          mobileNo: notification.MsgMobNo,
          message: notification.MsgText,
          seq: notification.Seq,
          providerResult: result,
          mode: mode
        });
      } catch (error: any) {
        console.error(`Error sending WhatsApp message to ${notification.MsgMobNo}:`, error);

        // Log failed WhatsApp send using an existing log category
        await logToFile('messages', {
          timestamp: new Date().toISOString(),
          action: 'A2A_WHATSAPP_SENT',
          status: 'ERROR',
          mobileNo: notification.MsgMobNo,
          message: notification.MsgText,
          seq: notification.Seq,
          error: error.message,
          mode: mode
        });
      }
    }

    return processedCount;
  }

  /**
   * Send SMS using the SMS server
   */
  private async sendSms(mobileNo: string, message: string, smsConfig: any): Promise<void> {
    // Generate random transaction ID
    const randomLetter = String.fromCharCode(Math.floor(Math.random() * 26) + 65); // A-Z
    const randomDigits1 = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
    const randomDigits2 = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
    const transId = `${randomLetter}${randomDigits1}${randomDigits2}`;

    const smsPayload = {
      message: message,
      mobileNo: mobileNo,
      transID: transId
    };

    // Create authorization header
    const authString = `${smsConfig.username || smsConfig.UserName || 'Bank'}:${smsConfig.password || 'Bank@2024'}`;
    const authBase64 = Buffer.from(authString).toString('base64');

    try {
      const response = await axios.post(
        `http://${smsConfig.host || '10.220.172.100'}:${smsConfig.port || 7070}${smsConfig.apiUrl || '/API/Service/Interface/v3/SendSMS'}`,
        smsPayload,
        {
          headers: {
            'UserId': smsConfig.userId || smsConfig.UserId || '124985',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authBase64}`
          },
          timeout: 10000
        }
      );

      console.log(`SMS sent successfully to ${mobileNo}:`, response.data);
    } catch (error: any) {
      console.error(`Error sending SMS to ${mobileNo}:`, error.message);
      throw error;
    }
  }
}