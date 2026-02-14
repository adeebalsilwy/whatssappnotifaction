import { logToFile } from './logger';
import type { ProviderResult } from './types';
import { generateFailedMessageTransactionId, parseTransactionId } from './transaction-utils';

/**
 * Comprehensive logging for fallback operations
 */

interface FallbackLogData {
  originalProvider: string;
  originalResult: ProviderResult;
  fallbackProvider: string;
  fallbackResult?: ProviderResult;
  phoneNumber: string;
  messageContent: string;
  transactionId?: string;
  timestamp: string;
}

/**
 * Logs a fallback attempt initiation
 */
export async function logFallbackAttempt(
  originalProvider: string,
  originalResult: ProviderResult,
  fallbackProvider: string,
  phoneNumber: string,
  messageContent: string
): Promise<string> {
  const timestamp = new Date().toISOString();
  const transactionId = generateFailedMessageTransactionId(phoneNumber, originalProvider);
  
  const logData: FallbackLogData = {
    originalProvider,
    originalResult,
    fallbackProvider,
    phoneNumber,
    messageContent,
    transactionId,
    timestamp
  };
  
  await logToFile('fallback', {
    event: 'FALLBACK_ATTEMPT_STARTED',
    ...logData,
    message: `Attempting fallback from ${originalProvider} to ${fallbackProvider} for ${phoneNumber}`
  });
  
  return transactionId;
}

/**
 * Logs successful fallback delivery
 */
export async function logFallbackSuccess(
  transactionId: string,
  fallbackResult: ProviderResult,
  deliveryTimeMs: number
): Promise<void> {
  const parsedInfo = parseTransactionId(transactionId);
  const timestamp = new Date().toISOString();
  
  await logToFile('fallback', {
    event: 'FALLBACK_DELIVERY_SUCCESS',
    transactionId,
    fallbackResult,
    deliveryTimeMs,
    timestamp,
    message: `Fallback delivery successful via ${fallbackResult.provider} in ${deliveryTimeMs}ms`
  });
  
  // Also log to SMS delivery category
  await logToFile('sms_delivery', {
    event: 'SMS_DELIVERY_SUCCESS',
    transactionId,
    provider: fallbackResult.provider,
    deliveryTimeMs,
    timestamp,
    message: `SMS delivered successfully via ${fallbackResult.provider}`
  });
}

/**
 * Logs failed fallback attempt
 */
export async function logFallbackFailure(
  transactionId: string,
  fallbackResult: ProviderResult,
  attemptNumber: number,
  maxAttempts: number
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  await logToFile('fallback', {
    event: 'FALLBACK_ATTEMPT_FAILED',
    transactionId,
    fallbackResult,
    attemptNumber,
    maxAttempts,
    timestamp,
    message: `Fallback attempt ${attemptNumber}/${maxAttempts} failed: ${fallbackResult.errorMessage}`
  });
  
  // Also log to errors category
  await logToFile('errors', {
    event: 'FALLBACK_DELIVERY_FAILED',
    transactionId,
    provider: fallbackResult.provider,
    error: fallbackResult.errorMessage,
    timestamp,
    message: `Fallback delivery failed via ${fallbackResult.provider}: ${fallbackResult.errorMessage}`
  });
}

/**
 * Logs when all fallback attempts are exhausted
 */
export async function logAllFallbacksExhausted(
  originalProvider: string,
  phoneNumber: string,
  totalAttempts: number,
  totalTimeMs: number
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  await logToFile('fallback', {
    event: 'ALL_FALLBACKS_EXHAUSTED',
    originalProvider,
    phoneNumber,
    totalAttempts,
    totalTimeMs,
    timestamp,
    message: `All ${totalAttempts} fallback attempts exhausted for ${phoneNumber}. Total time: ${totalTimeMs}ms`
  });
  
  await logToFile('errors', {
    event: 'MESSAGE_DELIVERY_FAILED',
    originalProvider,
    phoneNumber,
    totalAttempts,
    totalTimeMs,
    timestamp,
    message: `Message delivery completely failed after ${totalAttempts} attempts to ${phoneNumber}`
  });
}

/**
 * Logs delivery confirmation received from providers
 */
export async function logDeliveryConfirmation(
  provider: string,
  providerMessageId: string,
  status: string,
  timestamp: string,
  additionalData?: any
): Promise<void> {
  await logToFile('delivery_confirmation', {
    event: 'DELIVERY_STATUS_UPDATE',
    provider,
    providerMessageId,
    status,
    timestamp,
    additionalData,
    message: `Delivery status update from ${provider}: ${status}`
  });
}

/**
 * Logs SMS-specific delivery information
 */
export async function logSmsDelivery(
  transactionId: string,
  phoneNumber: string,
  messageContent: string,
  provider: string,
  deliveryStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED',
  providerResponse?: any
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  await logToFile('sms_delivery', {
    event: 'SMS_DELIVERY_EVENT',
    transactionId,
    phoneNumber,
    messageContent,
    provider,
    deliveryStatus,
    providerResponse,
    timestamp,
    message: `SMS ${deliveryStatus.toLowerCase()} via ${provider} to ${phoneNumber}`
  });
}

/**
 * Gets comprehensive fallback statistics from logs
 */
export async function getFallbackStatistics(daysBack: number = 7): Promise<{
  totalFallbacks: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  providerStats: Record<string, { attempts: number; successes: number; failures: number }>;
  dailyStats: Record<string, { attempts: number; successes: number }>;
}> {
  // This would read from the fallback logs and aggregate statistics
  // Implementation would depend on the specific log format and parsing needs
  
  return {
    totalFallbacks: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    providerStats: {},
    dailyStats: {}
  };
}