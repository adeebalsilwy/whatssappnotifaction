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

    // --- Auto-Template Conversion for Meta Reliability ---
    // If provider is Meta and message type is TEXT, convert to a General Template
    // to bypass the 24-hour window restriction for new customers.
    const effectiveProvider = payload.provider || appConfig.defaultProvider;
    if (effectiveProvider === 'meta' && payload.messageType === 'TEXT') {
      console.log(`[WhatsAppService] Converting TEXT message to Template for Meta reliability...`);
      payload.messageType = 'TEMPLATE';
      payload.templateId = 'arabic_general_notification';
      payload.variables = { '1': payload.body };
    }

    // --- Template Rendering if needed ---
    if (payload.messageType === 'TEMPLATE' && payload.templateId && !(payload as any).template) {
      try {
        const lang = payload.language || 'ar';
        const rendered = this.templateService.renderTemplate(payload.templateId, payload.variables || {}, lang);
        (payload as any).template = rendered.template;
        // Also update body with a preview if it's empty
        if (!payload.body || payload.body === 'N/A') {
          payload.body = `Template: ${payload.templateId}`;
        }
      } catch (e) {
        console.warn(`Could not render template ${payload.templateId}:`, (e as Error).message);
        // We continue anyway, the provider might handle it if it only needs the ID
      }
    }

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
      let result = await provider.sendTextMessage(payload, appConfig);

      // --- Enhanced Fallback & Recovery Logic ---
      if (!result.success) {
        // Handle Meta Error #132001: Template translation missing
        if (providerName === 'meta' && result.errorCode === '132001' && payload.templateId) {
          console.warn(`[WhatsAppService] Meta Template "${payload.templateId}" translation missing. Attempting recovery...`);

          // Try to find ANY translation for this template in our DB
          const allTmpls = this.templateService.getAllTemplates();
          const alternatives = allTmpls.filter(t => t.name === payload.templateId);

          if (alternatives.length > 0) {
            // Fallback to the first available language (often en or the only one we have)
            const fallbackTmpl = alternatives[0];
            console.log(`[WhatsAppService] Retrying with fallback language: ${fallbackTmpl.language}`);

            const retryPayload = { ...payload };
            const rendered = this.templateService.renderTemplate(payload.templateId, payload.variables || {}, fallbackTmpl.language);
            (retryPayload as any).template = rendered.template;

            result = await provider.sendTextMessage(retryPayload, appConfig);
          } else {
            // If no alternative found, convert to TEXT to ensure delivery
            console.log(`[WhatsAppService] No alternative translation found. Converting to TEXT for emergency delivery.`);
            const retryPayload = { ...payload };
            retryPayload.messageType = 'TEXT';
            // Use the body if available, otherwise construct from variables
            if (!retryPayload.body || retryPayload.body === `Template: ${payload.templateId}`) {
              retryPayload.body = `إشعار هام: يرجى العلم بخصوص ${payload.templateId}. تفاصيل: ${JSON.stringify(payload.variables)}`;
            }
            result = await provider.sendTextMessage(retryPayload, appConfig);
          }
        }

        if (!result.success) {
          const fallbackResult = await this.executeFallbackChain(payload, appConfig, providerName, result);
          if (fallbackResult) {
            return fallbackResult;
          }
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
        body: `Template: ${templateName}`,
        meta: {
          sourceSystem: 'TemplateService',
          txnId: `tmpl-${Date.now()}`,
          eventType: 'OTHER',
          template: renderedTemplate.template // Put it in meta.template too for compatibility
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
