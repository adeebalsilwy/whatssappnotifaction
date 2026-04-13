import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';
import { logToFile } from '@/lib/logger';

/**
 * Provider implementation for the official Meta WhatsApp Cloud API.
 * It transforms the generic payload into the format required by Meta's API
 * and handles the response mapping.
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.meta;
    
    if (!providerConfig?.url || !providerConfig.token || !providerConfig.numberId) {
      const errorResult: ProviderResult = {
        success: false,
        provider: 'meta',
        rawResponse: { error: 'Meta provider is not configured in whatsapp-config.json.' },
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Meta provider is missing URL, Token, or NumberID in settings.',
      };
      
      await logToFile('meta_delivery', {
        timestamp: new Date().toISOString(),
        action: 'CONFIGURATION_ERROR',
        recipient: payload.to,
        error: errorResult.errorMessage,
        configPresent: {
          url: !!providerConfig?.url,
          token: !!providerConfig?.token,
          numberId: !!providerConfig?.numberId
        }
      });
      
      return errorResult;
    }

    const apiUrl = `${providerConfig.url}/${providerConfig.numberId}/messages`;

    // If caller requested a TEMPLATE, forward Meta's template object (preferred) — otherwise send text
    let requestBody: any;

    if ((payload.messageType === 'TEMPLATE' && ((payload as any).template || (payload as any).meta?.template)) || (payload as any).templateId) {
      // Use provided rendered template if present, otherwise build a minimal template object
      const templateObj = (payload as any).template || (payload as any).meta?.template || {
        name: payload.templateId,
        language: { 
          code: payload.language || (payload.templateId?.startsWith('arabic_') || payload.templateId?.includes('-ar') ? 'ar' : 'en_US')
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

    // Log the attempt with detailed information
    await logToFile('meta_delivery', {
      timestamp: new Date().toISOString(),
      action: 'SEND_ATTEMPT',
      recipient: payload.to,
      messageType: payload.messageType,
      hasTemplate: !!(payload.templateId || (payload as any).template),
      templateId: payload.templateId,
      messageLength: payload.body?.length || 0
    });

    const startTime = Date.now();
    
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
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorMessage = responseData.error?.message || 'Meta API request failed';
        const errorCode = responseData.error?.code?.toString() || 'PROVIDER_ERROR';
        
        await logToFile('meta_delivery', {
          timestamp: new Date().toISOString(),
          action: 'SEND_FAILURE',
          recipient: payload.to,
          httpStatus: response.status,
          errorCode: errorCode,
          errorMessage: errorMessage,
          providerResponse: responseData,
          durationMs: duration
        });
        
        return {
          success: false,
          provider: 'meta',
          rawResponse: responseData,
          errorCode: errorCode,
          errorMessage: errorMessage,
          metadata: {
            deliveryDurationMs: duration
          }
        };
      }

      // Log successful delivery with comprehensive details
      await logToFile('meta_delivery', {
        timestamp: new Date().toISOString(),
        action: 'SEND_SUCCESS',
        recipient: payload.to,
        providerResponse: responseData,
        messageIds: responseData.messages?.map((msg: any) => msg.id) || [],
        durationMs: duration
      });

      // Map the provider's response back to our standard ProviderResult.
      return {
        success: true,
        provider: 'meta',
        providerMessageId: responseData.messages?.[0]?.id,
        rawResponse: responseData,
        metadata: {
          deliveryDurationMs: duration,
          messageIds: responseData.messages?.map((msg: any) => msg.id) || []
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
      
      await logToFile('meta_delivery', {
        timestamp: new Date().toISOString(),
        action: 'SEND_EXCEPTION',
        recipient: payload.to,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: duration
      });
      
      return {
        success: false,
        provider: 'meta',
        rawResponse: { error: errorMessage },
        errorCode: 'FETCH_ERROR',
        errorMessage: errorMessage,
        metadata: {
          deliveryDurationMs: duration
        }
      };
    }
  }
}