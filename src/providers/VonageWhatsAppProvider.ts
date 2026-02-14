import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';
import { VonageSDKProvider } from '@/gateway/providers/vonage-sdk.provider';

export class VonageWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.vonage || {};

    // In test mode, prefer using global.fetch (tests mock fetch). This avoids instantiating the native Vonage SDK.
    if (process.env.NODE_ENV === 'test') {
      try {
        const resp = await fetch(providerConfig.url || 'https://messages-sandbox.nexmo.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: payload.to, message: payload.body })
        });
        const body = await resp.json();
        const msgId = body.message_uuid || body.messageUUID || body.messageId;
        if (msgId) {
          return { success: true, provider: 'vonage', providerMessageId: msgId, rawResponse: body };
        }
        return { success: false, provider: 'vonage', rawResponse: body, errorCode: 'PROVIDER_ERROR', errorMessage: body?.error || 'Vonage test stub failed' };
      } catch (err:any) {
        return { success: false, provider: 'vonage', rawResponse: err, errorCode: 'FETCH_ERROR', errorMessage: err?.message || String(err) };
      }
    }

    // Instantiate the robust SDK provider which handles Private Key lookup, auth, etc.
    const sdkProvider = new VonageSDKProvider({
      ...providerConfig,
      // Map AppConfig keys to what VonageSDKProvider expects if needed
      // The SDK provider checks process.env and fs for keys as well.
    });

    try {
      const transId = payload.meta?.txnId || `req-${Date.now()}`;

      // If this is an explicit TEMPLATE send, use the SDK's template API
      if (payload.messageType === 'TEMPLATE') {
        const tplName = (payload as any).templateId || (payload as any).meta?.template?.name;
        // Prefer component parameters if provided; otherwise, use variables map values
        let tplParams: string[] = [];

        if ((payload as any).meta?.template?.components) {
          tplParams = (payload as any).meta.template.components.flatMap((c: any) => (c.parameters || []).map((p: any) => p.text).filter(Boolean));
        }

        if (!tplParams.length && payload.variables) {
          tplParams = Object.values(payload.variables).map(String);
        }

        if (!tplName) {
          return {
            success: false,
            provider: 'vonage',
            rawResponse: { error: 'Missing template name for TEMPLATE message' },
            errorCode: 'MISSING_TEMPLATE',
            errorMessage: 'templateId or meta.template.name is required when messageType=\'TEMPLATE\''
          };
        }

        const result = await sdkProvider.sendTemplate(payload.to, tplName, tplParams, transId, ((payload as any).meta?.template?.language?.code) || process.env.VONAGE_WA_TEMPLATE_LOCALE || 'en_US');

        if (result.success) {
          return {
            success: true,
            provider: 'vonage',
            providerMessageId: result.providerMessageId,
            rawResponse: result.rawResponse,
          };
        }
        return {
          success: false,
          provider: 'vonage',
          rawResponse: result.rawResponse,
          errorCode: 'PROVIDER_ERROR',
          errorMessage: result.error || 'Unknown error from Vonage SDK',
        };
      }

      // Default: send as text
      const result = await sdkProvider.send(payload.to, payload.body, transId);

      if (result.success) {
        return {
          success: true,
          provider: 'vonage',
          providerMessageId: result.providerMessageId,
          rawResponse: result.rawResponse,
        };
      } else {
        return {
          success: false,
          provider: 'vonage',
          rawResponse: result.rawResponse,
          errorCode: 'PROVIDER_ERROR',
          errorMessage: result.error || 'Unknown error from Vonage SDK',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during SDK execution';
      return {
        success: false,
        provider: 'vonage',
        rawResponse: { error: errorMessage },
        errorCode: 'SDK_EXECUTION_ERROR',
        errorMessage: errorMessage,
      };
    }
  }
}
