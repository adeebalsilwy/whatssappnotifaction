import type { IWhatsAppProvider } from '@/providers/IWhatsAppProvider';
import { MetaWhatsAppProvider } from '@/providers/MetaWhatsAppProvider';
import { VonageWhatsAppProvider } from '@/providers/VonageWhatsAppProvider';
import { GenericWhatsAppProvider } from '@/providers/GenericWhatsAppProvider';
import type { OutgoingMessagePayload, Provider, ProviderResult } from '@/lib/types';
import getConfig from '@/config/providers';
import { DirectWhatsAppProvider } from '@/providers/DirectWhatsAppProvider';
import { FadSmsProvider } from '@/providers/FadSmsProvider';
import { A2AProvider } from '@/providers/A2AProvider';
import { logFallbackAttempt, logFallbackSuccess, logFallbackFailure, logAllFallbacksExhausted } from '@/lib/fallback-logger';
import { TemplateService } from './TemplateService';
import { logToFile } from '@/lib/logger';

/**
 * This service is the core of the gateway. It's responsible for:
 * 1. Holding instances of all available providers.
 * 2. Selecting the correct provider based on the request or default config.
 * 3. Delegating the message sending task to the selected provider.
 * This decouples the API route from the provider-specific implementations.
 * 
 * Enhanced to support simultaneous delivery via Meta and FAD APIs with professional logging.
 * 
 * ROBUSTNESS ENHANCEMENT:
 * - All logging operations are wrapped in try-catch so they never block the critical path (message sending).
 * - Message delivery continues even if logging/database operations fail.
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
       fad: new FadSmsProvider(),
      vonage: new VonageWhatsAppProvider(),
      generic: new GenericWhatsAppProvider(),
      direct: new DirectWhatsAppProvider(),
      a2a: new A2AProvider(),
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
   * Send message simultaneously via Meta and FAD APIs with professional logging
   * @param payload The validated message payload.
   * @returns A promise that resolves to the combined result from both providers.
   * 
   * CRITICAL ENHANCEMENT: All logging operations are wrapped in try-catch to ensure
   * that message delivery continues even if logging/database operations fail.
   */
  public async send(payload: OutgoingMessagePayload): Promise<ProviderResult> {
    const appConfig = getConfig();
    const startTime = Date.now();
    const transactionId = `simultaneous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log the initiation of simultaneous delivery (non-blocking)
    try {
      await logToFile('simultaneous_delivery', {
        transactionId,
        timestamp: new Date().toISOString(),
        action: 'DELIVERY_INITIATED',
        payload: {
          to: payload.to,
          body: payload.body,
          messageType: payload.messageType,
          templateId: payload.templateId
        }
      });
    } catch (logError) {
      // Even if logging fails, continue with message delivery
      console.error('[WhatsAppService] Failed to log delivery initiation:', logError);
    }

    // --- Template Validation and Fallback ---
    // If template is requested but doesn't exist, wrap in general template
    if (payload.messageType === 'TEMPLATE' && payload.templateId) {
      try {
        const templateExists = this.templateService.getTemplateByName(payload.templateId, payload.language);
        if (!templateExists) {
          console.log(`[WhatsAppService] Template '${payload.templateId}' not found. Wrapping in general template.`);
          
          // Fallback to general notification template
          payload.templateId = 'arabic_general_notification';
          payload.variables = { '1': payload.body || 'رسالة من بنك عدن الأول الإسلامي' };
        }
      } catch (error: any) {
        console.warn(`[WhatsAppService] Template validation failed for '${payload.templateId}':`, error.message);
        
        // Fallback to general template
        payload.templateId = 'arabic_general_notification';
        payload.variables = { '1': payload.body || 'رسالة من بنك عدن الأول الإسلامي' };
      }
    }

    // --- Auto-Template Conversion for Meta Reliability ---
    // If provider is Meta and message type is TEXT, convert to a General Template 
    // to bypass the 24-hour window restriction for new customers.
    const effectiveProvider = payload.provider || appConfig.defaultProvider;
    if (effectiveProvider === 'meta' && payload.messageType === 'TEXT') {
      console.log(`[WhatsAppService] Converting TEXT message to Template for Meta reliability...`);
      payload.messageType = 'TEMPLATE';
      payload.templateId = 'arabic_general_notification';
      payload.variables = { '1': payload.body || '' };
    }

    // --- Template Rendering & Professional Wrapping ---
    if (payload.messageType === 'TEMPLATE' && payload.templateId && !(payload as any).template) {
      try {
        const lang = payload.language || 'ar';
        const rendered = this.templateService.renderTemplate(payload.templateId, payload.variables || {}, lang);
        (payload as any).template = rendered.template;
        // Also update body with a preview if it's empty
        if (!payload.body || payload.body === 'N/A') {
          payload.body = `Template: ${payload.templateId}`;
        }
      } catch (e: any) {
        console.warn(`[WhatsAppService] Template '${payload.templateId}' rendering failed:`, e.message);
        
        // --- PROFESSIONAL FALLBACK WRAPPING ---
        // If specific template fails, wrap in the general professional template to ensure delivery
        console.log(`[WhatsAppService] Wrapping content in 'arabic_general_notification' as a professional fallback...`);
        
        const originalTemplateId = payload.templateId;
        payload.templateId = 'arabic_general_notification';
        
        // Construct a professional body for the general template if not already present
        if (!payload.body || payload.body === 'N/A' || payload.body.startsWith('Template:')) {
           const varsSummary = Object.values(payload.variables || {}).join(' - ');
           payload.body = `بنك عدن الأول الإسلامي: إشعار بخصوص ${originalTemplateId}. التفاصيل: ${varsSummary}`;
        }
        
        payload.variables = { '1': payload.body };
        
        try {
           const fallbackRendered = this.templateService.renderTemplate('arabic_general_notification', { '1': payload.body }, 'ar');
           (payload as any).template = fallbackRendered.template;
        } catch (innerError: any) {
           console.error(`[WhatsAppService] CRITICAL: General fallback template 'arabic_general_notification' is missing from database!`);
           // At this point, Meta might still try to send with just the templateId if it exists on their side
        }
      }
    }

    // --- Phone Number Normalization ---
    // Rule: Handle local numbers from Yemen, Saudi Arabia, UAE and other Arab countries properly.
    // Yemeni numbers: 774577134 (9 digits) -> +967774577134
    // Yemeni numbers: +967774577134, 967774577134, 00967774577134 -> normalized to +967774577134
    // Saudi numbers: 512345678 (9 digits) -> +966512345678
    // Saudi numbers: 0512345678 -> +966512345678
    // UAE numbers: 521234567 (9 digits) -> +971521234567
    // UAE numbers: 0521234567 -> +971521234567
    // Egyptian numbers: 1012345678 (10 digits starting with 1) -> +201012345678
    // Jordan numbers: 791234567 (9 digits starting with 7) -> +962791234567
    // Lebanon numbers: 71123456 (8 digits starting with 7) -> +96171123456
    // Kuwait numbers: 50123456 (8 digits starting with 5) -> +96550123456
    // International numbers: +447700123456, 447700123456, 00447700123456 -> normalized to +447700123456
    let cleanTo = payload.to.trim();

    // Extract only digits to check number characteristics
    const digitsOnly = cleanTo.replace(/[^\D]/g, '');

    const hasPlusPrefix = cleanTo.startsWith('+');
    const hasDoubleZeroPrefix = cleanTo.startsWith('00');
    
    // Check for specific country codes
    const hasYemenCountryCode = cleanTo.startsWith('967') && !hasPlusPrefix; // Has 967 without +
    const hasSaudiCountryCode = cleanTo.startsWith('966') && !hasPlusPrefix; // Has 966 without +
    const hasUaeCountryCode = cleanTo.startsWith('971') && !hasPlusPrefix; // Has 971 without +
    const hasEgyptCountryCode = cleanTo.startsWith('20') && !hasPlusPrefix; // Has 20 without +
    const hasJordanCountryCode = cleanTo.startsWith('962') && !hasPlusPrefix; // Has 962 without +
    const hasLebanonCountryCode = cleanTo.startsWith('961') && !hasPlusPrefix; // Has 961 without +
    const hasKuwaitCountryCode = cleanTo.startsWith('965') && !hasPlusPrefix; // Has 965 without +
    
    const hasPlusYemenCountryCode = cleanTo.startsWith('+967'); // Has +967
    const hasPlusSaudiCountryCode = cleanTo.startsWith('+966'); // Has +966
    const hasPlusUaeCountryCode = cleanTo.startsWith('+971'); // Has +971
    const hasPlusEgyptCountryCode = cleanTo.startsWith('+20'); // Has +20
    const hasPlusJordanCountryCode = cleanTo.startsWith('+962'); // Has +962
    const hasPlusLebanonCountryCode = cleanTo.startsWith('+961'); // Has +961
    const hasPlusKuwaitCountryCode = cleanTo.startsWith('+965'); // Has +965
    
    // Check if it's a local number for specific countries
    // Yemen: 7xxxxxxx (9 digits starting with 7)
    const isLocalYemenNumber = /^7\d{8}$/.test(digitsOnly); // 9 digits starting with 7
    
    // Saudi: 5xxxxxxxx (9 digits starting with 5) or 1xxxxxxxxx (10 digits starting with 1)
    const isLocalSaudiNumber = /^(5\d{8}|1\d{9})$/.test(digitsOnly); // 9 digits starting with 5 OR 10 digits starting with 1
    
    // UAE: 5xxxxxxxx (9 digits starting with 5) or 2xxxxxxx, 3xxxxxxx, 4xxxxxxx, 6xxxxxxx, 7xxxxxxx, 9xxxxxxx
    const isLocalUaeNumber = /^(5\d{8}|2\d{7}|3\d{7}|4\d{7}|6\d{7}|7\d{7}|9\d{7})$/.test(digitsOnly); // Various UAE formats
    
    // Egypt: 1xxxxxxxxx (10 digits starting with 1)
    const isLocalEgyptNumber = /^1\d{9}$/.test(digitsOnly); // 10 digits starting with 1
    
    // Jordan: 7xxxxxxxx (9 digits starting with 7)
    const isLocalJordanNumber = /^7\d{8}$/.test(digitsOnly); // 9 digits starting with 7
    
    // Lebanon: 3xxxxxxx, 7xxxxxxx, 8xxxxxxx (8 digits starting with 3, 7, or 8)
    const isLocalLebanonNumber = /^[378]\d{7}$/.test(digitsOnly); // 8 digits starting with 3, 7, or 8
    
    // Kuwait: 5xxxxxxx, 6xxxxxxx, 9xxxxxxx (8 digits starting with 5, 6, or 9)
    const isLocalKuwaitNumber = /^[569]\d{7}$/.test(digitsOnly); // 8 digits starting with 5, 6, or 9
    
    if (hasPlusPrefix) {
      // Already in international format with +
      // If it's +967, +966, +971, +20, +962, +961, +965 keep as is
      // If it's another country code, keep as is
      cleanTo = cleanTo;
    } else if (hasDoubleZeroPrefix) {
      // Convert 00 to + (e.g., 00966... becomes +966...)
      cleanTo = '+' + cleanTo.substring(2);
    } else if (hasPlusYemenCountryCode || hasPlusSaudiCountryCode || hasPlusUaeCountryCode || 
               hasPlusEgyptCountryCode || hasPlusJordanCountryCode || hasPlusLebanonCountryCode || hasPlusKuwaitCountryCode) {
      // Already in + format for specific countries, add + if missing
      if (!hasPlusPrefix) {
        cleanTo = '+' + cleanTo;
      }
    } else if (hasYemenCountryCode) {
      // Has 967... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (hasSaudiCountryCode) {
      // Has 966... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (hasUaeCountryCode) {
      // Has 971... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (hasEgyptCountryCode) {
      // Has 20... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (hasJordanCountryCode) {
      // Has 962... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (hasLebanonCountryCode) {
      // Has 961... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (hasKuwaitCountryCode) {
      // Has 965... without +, add +
      cleanTo = '+' + cleanTo;
    } else if (isLocalYemenNumber) {
      // Local Yemeni number (9 digits starting with 7), prepend +967
      cleanTo = `+967${digitsOnly}`;
    } else if (isLocalSaudiNumber) {
      // Local Saudi number (9 digits starting with 5 or 10 digits starting with 1), prepend +966
      if (digitsOnly.length === 9 && digitsOnly.startsWith('5')) {
        cleanTo = `+966${digitsOnly}`;
      } else if (digitsOnly.length === 10 && digitsOnly.startsWith('1')) {
        cleanTo = `+966${digitsOnly}`;
      } else {
        cleanTo = `+${cleanTo}`;
      }
    } else if (isLocalUaeNumber) {
      // Local UAE number, prepend +971
      cleanTo = `+971${digitsOnly}`;
    } else if (isLocalEgyptNumber) {
      // Local Egyptian number (10 digits starting with 1), prepend +20
      cleanTo = `+20${digitsOnly}`;
    } else if (isLocalJordanNumber) {
      // Local Jordanian number (9 digits starting with 7), prepend +962
      cleanTo = `+962${digitsOnly}`;
    } else if (isLocalLebanonNumber) {
      // Local Lebanese number (8 digits starting with 3, 7, or 8), prepend +961
      cleanTo = `+961${digitsOnly}`;
    } else if (isLocalKuwaitNumber) {
      // Local Kuwaiti number (8 digits starting with 5, 6, or 9), prepend +965
      cleanTo = `+965${digitsOnly}`;
    } else {
      // For other formats, add + if not already present
      if (!hasPlusPrefix) {
        cleanTo = `+${cleanTo}`;
      }
    }

    // Update the payload with the normalized number
    payload.to = cleanTo;
    // ---------------------------------

    // Send simultaneously via Meta and FAD
    const metaProvider = this.providers.meta;
    const fadProvider = this.providers.fad;

    if (!metaProvider || !fadProvider) {
      const missingProviders = [];
      if (!metaProvider) missingProviders.push('meta');
      if (!fadProvider) missingProviders.push('fad');
      
      // Log provider missing error (non-blocking)
      try {
        await logToFile('simultaneous_delivery', {
          transactionId,
          timestamp: new Date().toISOString(),
          action: 'PROVIDER_MISSING',
          missingProviders,
          error: `Required providers not available: ${missingProviders.join(', ')}`
        });
      } catch (logError) {
        console.error('[WhatsAppService] Failed to log provider missing error:', logError);
      }

      return {
        success: false,
        provider: 'meta', // Use an existing provider type
        rawResponse: { error: `Required providers not available: ${missingProviders.join(', ')}` },
        errorCode: 'PROVIDER_MISSING',
        errorMessage: `Required providers not available: ${missingProviders.join(', ')}`,
      };
    }

    try {
      // Execute both providers simultaneously
      const [metaResult, fadResult] = await Promise.allSettled([
        this.sendViaProvider(metaProvider, 'meta', payload, appConfig, transactionId),
        this.sendViaProvider(fadProvider, 'fad', payload, appConfig, transactionId)
      ]);

      const metaOutcome = metaResult.status === 'fulfilled' ? metaResult.value : this.createErrorResult('meta', metaResult.reason);
      const fadOutcome = fadResult.status === 'fulfilled' ? fadResult.value : this.createErrorResult('fad', fadResult.reason);

      const totalTime = Date.now() - startTime;

      // Log the combined results (non-blocking)
      try {
        await logToFile('simultaneous_delivery', {
          transactionId,
          timestamp: new Date().toISOString(),
          action: 'DELIVERY_COMPLETED',
          totalTimeMs: totalTime,
          meta: {
            success: metaOutcome.success,
            providerMessageId: metaOutcome.providerMessageId,
            errorCode: metaOutcome.errorCode,
            errorMessage: metaOutcome.errorMessage
          },
          fad: {
            success: fadOutcome.success,
            providerMessageId: fadOutcome.providerMessageId,
            errorCode: fadOutcome.errorCode,
            errorMessage: fadOutcome.errorMessage
          },
          overallSuccess: metaOutcome.success || fadOutcome.success
        });
      } catch (logError) {
        console.error('[WhatsAppService] Failed to log delivery completion:', logError);
      }

      // Return combined result - success if at least one provider succeeded
      return {
        success: metaOutcome.success || fadOutcome.success,
        provider: 'meta', // Use an existing provider type
        providerMessageId: metaOutcome.providerMessageId || fadOutcome.providerMessageId,
        rawResponse: {
          meta: metaOutcome,
          fad: fadOutcome,
          totalTimeMs: totalTime
        },
        metadata: {
          transactionId,
          metaSuccess: metaOutcome.success,
          fadSuccess: fadOutcome.success,
          metaMessageId: metaOutcome.providerMessageId,
          fadMessageId: fadOutcome.providerMessageId,
          deliveryTimeMs: totalTime
        }
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during simultaneous delivery.';

      // Log the exception (non-blocking)
      try {
        await logToFile('simultaneous_delivery', {
          transactionId,
          timestamp: new Date().toISOString(),
          action: 'DELIVERY_EXCEPTION',
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
      } catch (logError) {
        console.error('[WhatsAppService] Failed to log delivery exception:', logError);
      }

      return {
        success: false,
        provider: 'meta', // Use an existing provider type
        rawResponse: { error: errorMessage },
        errorCode: 'SIMULTANEOUS_DELIVERY_ERROR',
        errorMessage: errorMessage,
      };
    }
  }

  /**
   * Send message via a specific provider with detailed logging
   */
  private async sendViaProvider(
    provider: IWhatsAppProvider,
    providerName: Provider,
    payload: OutgoingMessagePayload,
    config: ReturnType<typeof getConfig>,
    transactionId: string
  ): Promise<ProviderResult> {
    const startTime = Date.now();
    
    // Log provider attempt (non-blocking)
    try {
      await logToFile('messages', { // Use existing log category instead of dynamic one
        transactionId,
        timestamp: new Date().toISOString(),
        action: 'SEND_ATTEMPT',
        provider: providerName,
        recipient: payload.to,
        messageType: payload.messageType,
        hasTemplate: !!payload.templateId
      });
    } catch (logError) {
      console.error(`[WhatsAppService] Failed to log ${providerName} send attempt:`, logError);
    }

    try {
      const result = await provider.sendTextMessage(payload, config);
      const duration = Date.now() - startTime;

      // Log provider result (non-blocking)
      try {
        await logToFile('messages', { // Use existing log category instead of dynamic one
          transactionId,
          timestamp: new Date().toISOString(),
          action: 'SEND_RESULT',
          provider: providerName,
          success: result.success,
          providerMessageId: result.providerMessageId,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          durationMs: duration
        });
      } catch (logError) {
        console.error(`[WhatsAppService] Failed to log ${providerName} result:`, logError);
      }

      return {
        ...result,
        metadata: {
          ...(result.metadata || {}),
          deliveryDurationMs: duration,
          transactionId
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log provider exception (non-blocking)
      try {
        await logToFile('messages', { // Use existing log category instead of dynamic one
          transactionId,
          timestamp: new Date().toISOString(),
          action: 'SEND_EXCEPTION',
          provider: providerName,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          durationMs: duration
        });
      } catch (logError) {
        console.error(`[WhatsAppService] Failed to log ${providerName} exception:`, logError);
      }

      return {
        success: false,
        provider: providerName,
        rawResponse: { error: errorMessage },
        errorCode: `${providerName.toUpperCase()}_EXCEPTION`,
        errorMessage: errorMessage,
        metadata: {
          deliveryDurationMs: duration,
          transactionId
        }
      };
    }
  }

  /**
   * Create error result from promise rejection
   */
  private createErrorResult(provider: Provider, error: any): ProviderResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      provider,
      rawResponse: { error: errorMessage },
      errorCode: `${provider.toUpperCase()}_PROMISE_REJECTION`,
      errorMessage: errorMessage,
    };
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
    const fallbackChain: Provider[] = [
      'meta','fad', 'direct', 'vonage', 'a2a', 'generic'];
    
    // Remove the original provider from the chain
    const availableFallbacks = fallbackChain.filter(p => p !== originalProvider);
    
    // Log the initial fallback attempt
    try {
      const transactionId = await logFallbackAttempt(
        originalProvider,
        originalResult,
        availableFallbacks[0], // First fallback provider
        payload.to,
        payload.body || ''
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
              try {
                await logFallbackSuccess(transactionId, fallbackResult, attemptDuration);
              } catch (logError) {
                console.error(`[WhatsAppService] Failed to log fallback success:`, logError);
              }
              
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
              try {
                await logFallbackFailure(
                  transactionId,
                  fallbackResult,
                  attemptCount,
                  availableFallbacks.length
                );
              } catch (logError) {
                console.error(`[WhatsAppService] Failed to log fallback failure:`, logError);
              }
            }
          } catch (fallbackError: any) {
            const fbMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
            console.error(`[WhatsAppService] Fallback to '${fallbackProvider}' threw exception:`, fbMsg);
            
            // Log exception as failed attempt
            try {
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
            } catch (logError) {
              console.error(`[WhatsAppService] Failed to log fallback exception:`, logError);
            }
          }
        }
      }
      
      // If all fallbacks failed, log and return the original error with enhanced information
      const totalTime = Date.now() - startTime;
      console.error(`[WhatsAppService] All fallback providers failed. Returning original error.`);
      
      try {
        await logAllFallbacksExhausted(
          originalProvider,
          payload.to,
          attemptCount,
          totalTime
        );
      } catch (logError) {
        console.error(`[WhatsAppService] Failed to log fallback exhaustion:`, logError);
      }
      
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
    } catch (logError: any) {
      console.error('[WhatsAppService] Failed to initiate fallback logging:', logError);
      // Continue with original error without fallback logging
      return {
        success: false,
        provider: originalProvider,
        errorCode: originalResult.errorCode,
        errorMessage: originalResult.errorMessage,
        rawResponse: originalResult.rawResponse
      };
    }
  }

  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    variables: Record<string, string | number>,
    providerName?: Provider
  ): Promise<ProviderResult> {
    try {
      // Check if template exists in our database
      const templateExists = this.templateService.getTemplateByName(templateName);
      if (!templateExists) {
        console.log(`[WhatsAppService] Template '${templateName}' not found in local database. Using fallback.`);
        // Use the general notification template as fallback
        templateName = 'arabic_general_notification';
        variables = { '1': `إشعار متعلق بـ ${templateName}` };
      }

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
    } catch (error: any) {
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
    to: string, 2
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