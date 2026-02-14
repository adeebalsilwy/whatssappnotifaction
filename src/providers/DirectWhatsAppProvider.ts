import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';

/**
 * Provider for a direct, custom HTTP-based WhatsApp service.
 * This allows sending messages via a personal or unofficial gateway.
 */
export class DirectWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.direct;

    if (!providerConfig?.url) {
      return {
        success: false,
        provider: 'direct',
        rawResponse: { error: 'Direct provider URL is not configured.' },
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Direct provider is missing URL in settings.',
      };
    }

    // Format phone number to ensure proper format for WhatsApp
    let formattedTo = this.formatPhoneNumber(payload.to);
    
    // A simple body format, assuming the custom endpoint knows what to do.
    const requestBody = {
      from: providerConfig.from || payload.from, // Use configured 'from' or fall back to payload
      to: formattedTo,
      body: payload.body,
      // Pass along metadata in case the endpoint can use it.
      meta: payload.meta,
    };

    try {
      const response = await fetch(providerConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(providerConfig.token && { 'Authorization': `Bearer ${providerConfig.token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      // Handle response parsing safely
      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch (parseError) {
        // If response is not JSON, create a basic response object
        responseData = { message: await response.text() };
      }

      if (!response.ok) {
        return {
          success: false,
          provider: 'direct',
          rawResponse: responseData,
          errorCode: 'PROVIDER_ERROR',
          errorMessage: (responseData as { error?: { message?: string }; message?: string }).error?.message || (responseData as { message?: string }).message || `Direct provider returned status ${response.status}.`,
        };
      }
      
      return {
        success: true,
        provider: 'direct',
        providerMessageId: (responseData as { id?: string; messageId?: string; providerMessageId?: string }).id || (responseData as { id?: string; messageId?: string; providerMessageId?: string }).messageId || (responseData as { id?: string; messageId?: string; providerMessageId?: string }).providerMessageId || `direct-${payload.meta?.txnId || Date.now()}`,
        rawResponse: responseData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
      return {
        success: false,
        provider: 'direct',
        rawResponse: { error: errorMessage },
        errorCode: 'FETCH_ERROR',
        errorMessage,
      };
    }
  }
  
  /**
   * Format phone number to ensure proper format for WhatsApp
   * @param phoneNumber The phone number to format
   * @returns Formatted phone number
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except leading '+'
    let cleanNumber = phoneNumber.trim().replace(/[\D+]/g, '');
    
    // If the number starts with '00', replace with '+'
    if (phoneNumber.trim().startsWith('00')) {
      cleanNumber = '+' + cleanNumber;
    }
    
    // If the number starts with '+' but has non-digits after, clean it
    if (phoneNumber.trim().startsWith('+')) {
      const plusMatch = phoneNumber.trim().match(/\+([\d]+)/);
      if (plusMatch) {
        cleanNumber = '+' + plusMatch[1];
      } else {
        cleanNumber = '+' + cleanNumber;
      }
    }
    
    // If no country code is present, assume Yemen country code
    if (!cleanNumber.startsWith('+') && !cleanNumber.startsWith('967') && cleanNumber.length > 7) {
      // If the number appears to be a local number without country code, prepend Yemen's country code
      // For Yemen, numbers typically start with 7 after country code
      if (cleanNumber.startsWith('7') && cleanNumber.length === 9) {
        cleanNumber = '967' + cleanNumber;
      }
    }
    
    // If it doesn't start with + but has country code, add +
    if (!cleanNumber.startsWith('+') && (cleanNumber.startsWith('967') || cleanNumber.length > 10)) {
      cleanNumber = '+' + cleanNumber;
    }
    
    return cleanNumber;
  }
}
