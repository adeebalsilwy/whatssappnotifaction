import type { IWhatsAppProvider } from './IWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';
import { logToFile } from '@/lib/logger';

/**
 * Provider for FAD SMS API integration
 * Sends SMS messages when WhatsApp delivery fails
 */
export class FadSmsProvider implements IWhatsAppProvider {
  async sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult> {
    const providerConfig = config.providers.fad;
    
    if (!providerConfig?.url || !providerConfig.username || !providerConfig.password) {
      const errorResult: ProviderResult = {
        success: false,
        provider: 'fad',
        rawResponse: { error: 'FAD provider is not configured properly.' },
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'FAD provider is missing URL, username, or password in settings.',
      };
      
      await logToFile('fad_delivery', {
        timestamp: new Date().toISOString(),
        action: 'CONFIGURATION_ERROR',
        recipient: payload.to,
        error: errorResult.errorMessage,
        configPresent: {
          url: !!providerConfig?.url,
          username: !!providerConfig?.username,
          password: !!providerConfig?.password
        }
      });
      
      return errorResult;
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

      // Log the attempt with detailed information
      await logToFile('fad_delivery', {
        timestamp: new Date().toISOString(),
        action: 'SEND_ATTEMPT',
        transactionId,
        originalRecipient: payload.to,
        formattedNumber,
        messageLength: payload.body?.length || 0,
        hasTemplate: !!payload.templateId,
        messageType: payload.messageType
      });

      const startTime = Date.now();
      
      // Different authentication methods can be supported
      // Check if a specific auth method is configured, otherwise default to Basic
      const authMethod = providerConfig.authMethod || 'basic';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add UserID header if specified in config
      const userIdValue = providerConfig.userId || providerConfig.userid || providerConfig.userID;
      if (userIdValue) {
        headers['UserID'] = userIdValue;
      }

      if (authMethod.toLowerCase() === 'basic') {
        headers['Authorization'] = `Basic ${Buffer.from(`${providerConfig.username}:${providerConfig.password}`).toString('base64')}`;
      } else if (authMethod.toLowerCase() === 'bearer') {
        headers['Authorization'] = `Bearer ${providerConfig.token || providerConfig.password}`;
      } else if (authMethod.toLowerCase() === 'custom') {
        // Allow for custom authentication headers
        headers = {
          ...headers,
          ...(providerConfig.customAuthHeaders || {})
        };
      } else {
        // Default to Basic authentication
        headers['Authorization'] = `Basic ${Buffer.from(`${providerConfig.username}:${providerConfig.password}`).toString('base64')}`;
      }

      const response = await fetch(providerConfig.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      // Try to parse response as JSON regardless of content type
      // Some APIs return JSON with wrong content-type headers
      let responseData;
      let responseText;
      
      try {
        responseText = await response.text();
        
        // Try to parse as JSON first
        try {
          responseData = JSON.parse(responseText);
        } catch {
          // If not valid JSON, treat as error or create a generic response
          if (response.status === 401) {
            responseData = {
              error: `Authentication failed (401 Unauthorized): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`,
              message: 'FAD API authentication failed - check credentials',
              errorCode: 'AUTHENTICATION_ERROR'
            };
          } else if (response.status >= 400) {
            responseData = {
              error: `HTTP ${response.status} Error: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`,
              message: `FAD API request failed with status ${response.status}`,
              errorCode: `HTTP_${response.status}_ERROR`
            };
          } else {
            // For 2xx responses that are not JSON, try to see if they contain success indicators
            if (responseText.toLowerCase().includes('success') || 
                responseText.includes('"Error_no" : 0') || 
                responseText.includes('"Error_no":"0"') ||
                responseText.includes('"error_no":0')) {
              // Parse what we can from the response
              try {
                // Try to extract the JSON portion if it exists
                const jsonMatches = responseText.match(/\{[\s\S]*?\}/); // Use [\s\S] to match any character including newlines
                if (jsonMatches && jsonMatches[0]) {
                  const extractedJson = JSON.parse(jsonMatches[0]);
                  responseData = extractedJson;
                } else {
                  responseData = {
                    message: 'FAD API request processed',
                    responseText: responseText,
                    success: true
                  };
                }
              } catch {
                responseData = {
                  message: 'FAD API request processed',
                  responseText: responseText,
                  success: true
                };
              }
            } else {
              responseData = {
                error: `Non-JSON response received: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`,
                message: 'FAD API returned non-JSON response'
              };
            }
          }
        }
      } catch (err: any) {
        // Handle network or other errors
        responseData = {
          error: `Network error: ${(err as Error).message}`,
          message: 'Error reading FAD API response'
        };
      }

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || `FAD API request failed with status ${response.status}`;
        const errorCode = responseData.errorCode || `FAD_API_STATUS_${response.status}_ERROR`;
        
        await logToFile('fad_delivery', {
          timestamp: new Date().toISOString(),
          action: 'SEND_FAILURE',
          transactionId,
          recipient: formattedNumber,
          httpStatus: response.status,
          error: errorMessage,
          providerResponse: responseData,
          durationMs: duration
        });
        
        return {
          success: false,
          provider: 'fad',
          rawResponse: responseData,
          errorCode: errorCode,
          errorMessage: errorMessage,
          metadata: {
            transactionId,
            deliveryDurationMs: duration
          }
        };
      }

      // Check if the response indicates success based on FAD's format
      const isSuccess = (responseData.Error_no === 0 || 
                         responseData.error_no === 0 || 
                         responseData.Error_no === "0" ||
                         (responseText && responseText.includes('"Error_no" : 0')) ||
                         (responseText && responseText.toLowerCase().includes('successful')));

      if (isSuccess) {
        // Log successful delivery with comprehensive details
        await logToFile('fad_delivery', {
          timestamp: new Date().toISOString(),
          action: 'SEND_SUCCESS',
          transactionId,
          recipient: formattedNumber,
          providerResponse: responseData,
          durationMs: duration,
          messageReference: responseData.transID || responseData.messageId || responseData.reference || transactionId
        });

        return {
          success: true,
          provider: 'fad',
          providerMessageId: transactionId,
          rawResponse: responseData,
          metadata: {
            transactionId,
            deliveryDurationMs: duration,
            messageReference: responseData.transID || responseData.messageId || responseData.reference || transactionId
          }
        };
      } else {
        // Treat as failure if response indicates error
        const errorMessage = responseData.Error_Name || responseData.error || `FAD API returned error: ${JSON.stringify(responseData)}`;
        
        await logToFile('fad_delivery', {
          timestamp: new Date().toISOString(),
          action: 'SEND_FAILURE',
          transactionId,
          recipient: formattedNumber,
          httpStatus: response.status,
          error: errorMessage,
          providerResponse: responseData,
          durationMs: duration
        });
        
        return {
          success: false,
          provider: 'fad',
          rawResponse: responseData,
          errorCode: 'FAD_API_ERROR',
          errorMessage: errorMessage,
          metadata: {
            transactionId,
            deliveryDurationMs: duration
          }
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during FAD API call';
      
      await logToFile('fad_delivery', {
        timestamp: new Date().toISOString(),
        action: 'SEND_EXCEPTION',
        recipient: payload.to,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
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
}