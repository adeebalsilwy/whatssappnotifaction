import type { AppConfig, OutgoingMessagePayload, ProviderResult } from '@/lib/types';

/**
 * This interface defines the contract that every WhatsApp provider must follow.
 * To add a new provider, you must create a class that implements this interface.
 * This ensures that the main notification service can interact with any provider
 * in a uniform way.
 */
export interface IWhatsAppProvider {
  /**
   * Sends a text message using the specific provider's API.
   * @param payload The generic message payload.
   * @param config The application configuration containing credentials.
   * @returns A promise that resolves to a standardized ProviderResult.
   */
  sendTextMessage(payload: OutgoingMessagePayload, config: AppConfig): Promise<ProviderResult>;
}
