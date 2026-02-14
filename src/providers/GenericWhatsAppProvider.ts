import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';

/**
 * Provider implementation for a generic, simple HTTP-based WhatsApp service.
 * This is useful for integrating with local or custom-built WhatsApp gateways.
 */
export class GenericWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.generic;

    if (!providerConfig?.url) {
      return {
        success: false,
        provider: 'generic',
        rawResponse: { error: 'Generic provider URL is not configured in whatsapp-config.json.' },
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Generic provider is missing URL in settings.',
      };
    }
    
    // Map the generic payload to this provider's simple format.
    const requestBody = {
      number: payload.to,
      message: payload.body,
    };

    try {
      const response = await fetch(providerConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use a token for authentication if provided
          ...(providerConfig.token && { 'Authorization': `Bearer ${providerConfig.token}` }),
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.ok) {
        return {
          success: false,
          provider: 'generic',
          rawResponse: responseData,
          errorCode: 'PROVIDER_ERROR',
          errorMessage: responseData.details || 'Generic provider error',
        };
      }
      
      // Map the provider's response back to our standard ProviderResult.
      return {
        success: true,
        provider: 'generic',
        providerMessageId: responseData.id,
        rawResponse: responseData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
      return {
        success: false,
        provider: 'generic',
        rawResponse: { error: errorMessage },
        errorCode: 'FETCH_ERROR',
        errorMessage: errorMessage,
      };
    }
  }
}
