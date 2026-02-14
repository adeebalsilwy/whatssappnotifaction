import type { IWhatsAppProvider } from '@/providers/IWhatsAppProvider';
import { MetaWhatsAppProvider } from '@/providers/MetaWhatsAppProvider';
import { VonageWhatsAppProvider } from '@/providers/VonageWhatsAppProvider';
import { GenericWhatsAppProvider } from '@/providers/GenericWhatsAppProvider';
import type { OutgoingMessagePayload, Provider, ProviderResult } from '@/lib/types';
import getConfig from '@/config/providers';
import { DirectWhatsAppProvider } from '@/providers/DirectWhatsAppProvider';
import { FadSmsProvider } from '@/providers/FadSmsProvider';
import { logFallbackAttempt, logFallbackSuccess, logFallbackFailure, logAllFallbacksExhausted } from '@/lib/fallback-logger';
import { TemplateService } from './TemplateService';

/**
 * This service is the core of the gateway. It's responsible for:
 * 1. Holding instances of all available providers.
 * 2. Selecting the correct provider based on the request or default config.
 * 3. Delegating the message sending task to the selected provider.
 * This decouples the API route from the provider-specific implementations.
 */
import whatsapp_templates from '../config/whatsapp-arabic-templates.json';

export class WhatsAppNotificationService {
  private providers: Partial<Record<Provider, IWhatsAppProvider>>;
  private templateService: TemplateService;

  constructor() {
    /**
     * To add a new provider, instantiate it and add it to this map.
     * The key should match the `provider` name in the API payload and config.
     */
    this.providers = {
      meta: new MetaWhatsAppProvider(),
      vonage: new VonageWhatsAppProvider(),
      generic: new GenericWhatsAppProvider(),
      direct: new DirectWhatsAppProvider(),
      fad: new FadSmsProvider(),
    };
    
    this.templateService = new TemplateService();
  }

  /**
   * Process an incoming message from a provider
   * @param provider The provider name
   * @param messageData The incoming message data
   * @returns Promise resolving when processing is complete
   */
  async processIncomingMessage(provider: Provider, messageData: any): Promise<void> {
    // Here you can add business logic for processing incoming messages
    // For example: trigger auto-replies, forward to other systems, etc.
    
    console.log(`Processing incoming ${provider} message:`, messageData);
    
    // Example: Check if message contains specific keywords for auto-reply
    if (provider === 'meta' && messageData.content && typeof messageData.content === 'string') {
      // Add specific business logic for incoming messages
      // This could include triggering automated responses based on content
    }
  }

  /**
   * Selects a provider and sends a message.
   * @param payload The validated message payload.
   * @returns A promise that resolves to the result from the provider.
   */
  public async send(payload: OutgoingMessagePayload): Promise<ProviderResult> {
    const appConfig = getConfig();

    // --- Phone Number Normalization ---
    // Rule: If the country key (code) is not present, default to Yemen (+967).
    // We assume the key is present if the number starts with '+', '00', or '967'.
    let cleanTo = payload.to.trim();

    // Remove all non-digit characters except leading '+'
    // cleanTo = cleanTo.replace(/[^\d+]/g, ''); // Optional strict cleaning

    const hasInternationalPrefix = cleanTo.startsWith('+') || cleanTo.startsWith('00');
    const hasCountryCode = cleanTo.startsWith('967');

    if (!hasInternationalPrefix && !hasCountryCode) {
      // Prepend default Yemen country code
      cleanTo = `967${cleanTo}`;
    }

    // Update the payload with the normalized number
    payload.to = cleanTo;
    // ---------------------------------

    const providerName = payload.provider || appConfig.defaultProvider;
    const provider = this.providers[providerName];

    if (!provider) {
      return {
        success: false,
        provider: providerName,
        rawResponse: { error: 'Provider not found or not configured.' },
        errorCode: 'INVALID_PROVIDER',
        errorMessage: `Provider "${providerName}" is not a valid or configured provider.`,
      };
    }

    try {
      // Pass the current config to the provider
      const result = await provider.sendTextMessage(payload, appConfig);

      // --- Enhanced Fallback Logic ---
      if (!result.success) {
        const fallbackResult = await this.executeFallbackChain(payload, appConfig, providerName, result);
        if (fallbackResult) {
          return fallbackResult;
        }
      }
      // --------------------------------

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred in the provider.';

      // --- Enhanced Fallback Logic (Exception Case) ---
      const fallbackResult = await this.executeFallbackChain(payload, appConfig, providerName, {
        success: false,
        provider: providerName,
        errorCode: 'PROVIDER_EXCEPTION',
        errorMessage: errorMessage,
        rawResponse: { error: errorMessage }
      });
      
      if (fallbackResult) {
        return fallbackResult;
      }
      // --------------------------------------------------

      return {
        success: false,
        provider: providerName,
        rawResponse: { error: errorMessage },
        errorCode: 'PROVIDER_EXECUTION_ERROR',
        errorMessage: errorMessage,
      };
    }
  }

  /**
   * Execute the fallback chain for failed messages
   * @param payload The message payload
   * @param appConfig Application configuration
   * @param originalProvider The original provider that failed
   * @param originalResult The result from the original provider
   * @returns Fallback result or null if no fallback available
   */
  private async executeFallbackChain(
    payload: OutgoingMessagePayload, 
    appConfig: ReturnType<typeof getConfig>, 
    originalProvider: Provider, 
    originalResult: ProviderResult
  ): Promise<ProviderResult | null> {
    
    console.log(`[WhatsAppService] ${originalProvider} failed. Executing fallback chain...`);
    
    const startTime = Date.now();
    
    // Define fallback priority chain based on reliability and cost
    const fallbackChain: Provider[] = ['direct', 'vonage', 'meta', 'generic', 'fad'];
    
    // Remove the original provider from the chain
    const availableFallbacks = fallbackChain.filter(p => p !== originalProvider);
    
    // Log the initial fallback attempt
    const transactionId = await logFallbackAttempt(
      originalProvider,
      originalResult,
      availableFallbacks[0], // First fallback provider
      payload.to,
      payload.body
    );
    
    let attemptCount = 0;
    
    // Try each fallback provider in order
    for (const fallbackProvider of availableFallbacks) {
      attemptCount++;
      const providerInstance = this.providers[fallbackProvider];
      
      if (providerInstance) {
        try {
          console.log(`[WhatsAppService] Attempting fallback to '${fallbackProvider}' provider...`);
          
          const attemptStartTime = Date.now();
          const fallbackResult = await providerInstance.sendTextMessage(payload, appConfig);
          const attemptDuration = Date.now() - attemptStartTime;
          
          if (fallbackResult.success) {
            console.log(`[WhatsAppService] Fallback to '${fallbackProvider}' successful.`);
            
            // Log successful fallback
            await logFallbackSuccess(transactionId, fallbackResult, attemptDuration);
            
            // Indicate this was a fallback delivery
            return {
              ...fallbackResult,
              provider: fallbackProvider,
              metadata: {
                ...(fallbackResult.metadata || {}),
                fallbackFrom: originalProvider,
                originalErrorCode: originalResult.errorCode,
                originalErrorMessage: originalResult.errorMessage,
                fallbackTransactionId: transactionId,
                fallbackAttempt: attemptCount,
                fallbackDurationMs: attemptDuration
              }
            };
          } else {
            console.error(`[WhatsAppService] Fallback to '${fallbackProvider}' also failed: ${fallbackResult.errorMessage}`);
            
            // Log failed fallback attempt
            await logFallbackFailure(
              transactionId,
              fallbackResult,
              attemptCount,
              availableFallbacks.length
            );
          }
        } catch (fallbackError) {
          const fbMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
          console.error(`[WhatsAppService] Fallback to '${fallbackProvider}' threw exception:`, fbMsg);
          
          // Log exception as failed attempt
          await logFallbackFailure(
            transactionId,
            {
              success: false,
              provider: fallbackProvider,
              errorCode: 'FALLBACK_EXCEPTION',
              errorMessage: fbMsg,
              rawResponse: { error: fbMsg }
            },
            attemptCount,
            availableFallbacks.length
          );
        }
      }
    }
    
    // If all fallbacks failed, log and return the original error with enhanced information
    const totalTime = Date.now() - startTime;
    console.error(`[WhatsAppService] All fallback providers failed. Returning original error.`);
    
    await logAllFallbacksExhausted(
      originalProvider,
      payload.to,
      attemptCount,
      totalTime
    );
    
    return {
      success: false,
      provider: originalProvider,
      errorCode: 'ALL_PROVIDERS_FAILED',
      errorMessage: `Original ${originalProvider} failed: ${originalResult.errorMessage}. All fallbacks also failed after ${attemptCount} attempts.`,
      rawResponse: {
        original: originalResult.rawResponse,
        fallbackAttempts: availableFallbacks,
        totalTimeMs: totalTime,
        totalAttempts: attemptCount
      },
      metadata: {
        fallbackTransactionId: transactionId,
        totalFallbackAttempts: attemptCount,
        totalTimeMs: totalTime
      }
    };
  }

  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    variables: Record<string, string | number>,
    providerName?: Provider
  ): Promise<ProviderResult> {
    try {
      // Render the template with the provided variables
      const renderedTemplate = this.templateService.renderTemplate(templateName, variables);
      
      // Use specified provider or default to configured provider
      const appConfig = getConfig();
      const providerToUse = providerName || appConfig.defaultProvider;
      const provider = this.providers[providerToUse];
      
      if (!provider) {
        return {
          success: false,
          provider: providerToUse,
          rawResponse: { error: 'Provider not found or not configured.' },
          errorCode: 'INVALID_PROVIDER',
          errorMessage: `Provider "${providerToUse}" is not a valid or configured provider.`,
        };
      }
      
      // Create a message payload from the rendered template — mark as TEMPLATE so providers can send MTM
      const payload: OutgoingMessagePayload = {
        to,
        provider: providerToUse,
        messageType: 'TEMPLATE',
        templateId: templateName,
        // Keep a preview/body for logging and fallback; real template content is sent via meta.template
        body: renderedTemplate.template.components[0]?.parameters[0]?.text || '',
        meta: {
          sourceSystem: 'TemplateService',
          txnId: `tmpl-${Date.now()}`,
          eventType: 'OTHER'
        } as any,
        variables: Object.fromEntries(
          Object.entries(variables).map(([key, value]) => [key, String(value)])
        )
      };
      
      // Add template to the payload as an extension
      (payload as any).template = renderedTemplate.template;

      // Send the template message via the provider
      return await provider.sendTextMessage(payload, appConfig);
    } catch (error) {
      console.error('Error sending WhatsApp template message:', error);
      
      // Return error result
      return {
        success: false,
        provider: providerName || getConfig().defaultProvider,
        rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
        errorCode: 'TEMPLATE_RENDER_ERROR',
        errorMessage: error instanceof Error ? error.message : 'An error occurred while rendering the template.',
      };
    }
  }

  async sendAccountOpeningNotification(
    to: string, 
    customerInfo: {
      customerId: string | number;
      accountType: string;
      productId: string | number;
    },
    providerName?: Provider
  ): Promise<ProviderResult> {
    return this.sendTemplateMessage(
      to, 
      'account_opening_notification', 
      {
        customer_id: customerInfo.customerId,
        account_type: customerInfo.accountType,
        product_id: customerInfo.productId
      },
      providerName
    );
  }

  async sendDepositNotification(
    to: string, 
    depositInfo: {
      amount: string | number;
      lastDigits: string;
      date: string;
      currency: string;
      balance: string | number;
    },
    providerName?: Provider
  ): Promise<ProviderResult> {
    return this.sendTemplateMessage(
      to, 
      'deposit_notification', 
      {
        amount: depositInfo.amount,
        last_digits: depositInfo.lastDigits,
        date: depositInfo.date,
        currency: depositInfo.currency,
        balance: depositInfo.balance
      },
      providerName
    );
  }

  async sendWithdrawalNotification(
    to: string, 
    withdrawalInfo: {
      amount: string | number;
      lastDigits: string;
      date: string;
      currency: string;
      balance: string | number;
    },
    providerName?: Provider
  ): Promise<ProviderResult> {
    return this.sendTemplateMessage(
      to, 
      'withdrawal_notification', 
      {
        amount: withdrawalInfo.amount,
        last_digits: withdrawalInfo.lastDigits,
        date: withdrawalInfo.date,
        currency: withdrawalInfo.currency,
        balance: withdrawalInfo.balance
      },
      providerName
    );
  }
}
