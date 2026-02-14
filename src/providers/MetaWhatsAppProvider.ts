import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';

/**
 * Provider implementation for the official Meta WhatsApp Cloud API.
 * It transforms the generic payload into the format required by Meta's API
 * and handles the response mapping.
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.meta;
    
    if (!providerConfig?.url || !providerConfig.token || !providerConfig.numberId) {
      return {
        success: false,
        provider: 'meta',
        rawResponse: { error: 'Meta provider is not configured in whatsapp-config.json.' },
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Meta provider is missing URL, Token, or NumberID in settings.',
      };
    }

    const apiUrl = `${providerConfig.url}/${providerConfig.numberId}/messages`;

    // If caller requested a TEMPLATE, forward Meta's template object (preferred) — otherwise send text
    let requestBody: any;

    if ((payload.messageType === 'TEMPLATE' && ((payload as any).template || (payload as any).meta?.template)) || (payload as any).templateId) {
      // Use provided rendered template if present, otherwise build a minimal template object
      const templateObj = (payload as any).template || (payload as any).meta?.template || {
        name: payload.templateId,
        language: {
          code: payload.templateId?.startsWith('arabic_') || payload.templateId?.includes('-ar') ? 'ar' : 'en_US'
        },
        components: []
      };

      requestBody = {
        messaging_product: 'whatsapp',
        to: payload.to,
        type: 'template',
        template: templateObj,
      };
    } else {
      // Fallback to plain text
      requestBody = {
        messaging_product: 'whatsapp',
        to: payload.to,
        type: 'text',
        text: {
          preview_url: false,
          body: payload.body,
        },
      };
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerConfig.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: 'meta',
          rawResponse: responseData,
          errorCode: responseData.error?.code?.toString() || 'PROVIDER_ERROR',
          errorMessage: responseData.error?.message,
        };
      }

      // Map the provider's response back to our standard ProviderResult.
      return {
        success: true,
        provider: 'meta',
        providerMessageId: responseData.messages?.[0]?.id,
        rawResponse: responseData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
      return {
        success: false,
        provider: 'meta',
        rawResponse: { error: errorMessage },
        errorCode: 'FETCH_ERROR',
        errorMessage: errorMessage,
      };
    }
  }
}
