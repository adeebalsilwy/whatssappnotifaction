import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';

/**
 * Provider for FAD SMS API integration
 * Sends SMS messages when WhatsApp delivery fails
 */
export class FadSmsProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.fad;
    
    if (!providerConfig?.url || !providerConfig.username || !providerConfig.password) {
      return {
        success: false,
        provider: 'fad',
        rawResponse: { error: 'FAD provider is not configured properly.' },
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'FAD provider is missing URL, username, or password in settings.',
      };
    }

    try {
      // Generate transaction ID for failed message tracking
      const transactionId = this.generateTransactionId(payload.to);
      
      // Format phone number (remove + and country code for Yemeni numbers)
      const formattedNumber = this.formatPhoneNumber(payload.to);
      
      // Prepare the FAD API request body
      const requestBody = {
        message: payload.body,
        mobileNo: formattedNumber,
        transID: transactionId
      };

      // Log the attempt
      await this.logAttempt(payload, transactionId, requestBody);

      const response = await fetch(providerConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${providerConfig.username}:${providerConfig.password}`).toString('base64')}`
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || 'FAD API request failed';
        await this.logFailure(payload, transactionId, requestBody, responseData, errorMessage);
        
        return {
          success: false,
          provider: 'fad',
          rawResponse: responseData,
          errorCode: responseData.errorCode || 'FAD_API_ERROR',
          errorMessage: errorMessage,
        };
      }

      // Log successful delivery
      await this.logSuccess(payload, transactionId, requestBody, responseData);

      return {
        success: true,
        provider: 'fad',
        providerMessageId: transactionId,
        rawResponse: responseData,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during FAD API call';
      await this.logException(payload, errorMessage);
      
      return {
        success: false,
        provider: 'fad',
        rawResponse: { error: errorMessage },
        errorCode: 'FAD_EXCEPTION',
        errorMessage: errorMessage,
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove + and country code for Yemeni numbers
    // Convert +967774577134 to 774577134
    let formatted = phoneNumber.replace(/^\+/, '');
    if (formatted.startsWith('967')) {
      formatted = formatted.substring(3);
    }
    return formatted;
  }

  private generateTransactionId(phoneNumber: string): string {
    // Generate transaction ID with timestamp + phone number + random component
    const timestamp = Date.now();
    const phoneSuffix = phoneNumber.replace(/[^\d]/g, '').slice(-6); // Last 6 digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${phoneSuffix}${random}`;
  }

  private async logAttempt(payload: OutgoingMessagePayload, transactionId: string, requestBody: any) {
    console.log(`[FAD_SMS] Attempting SMS delivery`, {
      originalTo: payload.to,
      formattedNumber: requestBody.mobileNo,
      transactionId,
      messageLength: payload.body.length
    });
  }

  private async logSuccess(payload: OutgoingMessagePayload, transactionId: string, requestBody: any, response: any) {
    console.log(`[FAD_SMS] SMS delivered successfully`, {
      transactionId,
      recipient: requestBody.mobileNo,
      providerResponse: response
    });
  }

  private async logFailure(payload: OutgoingMessagePayload, transactionId: string, requestBody: any, response: any, errorMessage: string) {
    console.error(`[FAD_SMS] SMS delivery failed`, {
      transactionId,
      recipient: requestBody.mobileNo,
      error: errorMessage,
      providerResponse: response
    });
  }

  private async logException(payload: OutgoingMessagePayload, errorMessage: string) {
    console.error(`[FAD_SMS] Exception during SMS delivery`, {
      recipient: payload.to,
      error: errorMessage
    });
  }
}