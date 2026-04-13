import type { z } from 'zod';
import type { OutgoingMessagePayloadSchema } from './validation';

/**
 * Defines the list of supported WhatsApp providers.
 */
export const providers = ['meta', 'vonage', 'generic', 'direct', 'legacy', 'twilio', 'fad', 'a2a'] as const;

export type Provider = (typeof providers)[number];

/**
 * Represents the structured payload for an outgoing message,
 * inferred from the Zod validation schema.
 */
export type OutgoingMessagePayload = z.infer<typeof OutgoingMessagePayloadSchema>;

/**
 * Represents the unified result structure from any provider after a send attempt.
 */
export type ProviderResult = {
  success: boolean;
  provider: Provider;
  providerMessageId?: string;
  rawResponse: any;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
};

/**
 * Represents the structure of a single log entry.
 */
export type LogEntry = {
  timestamp: string;
  provider: Provider;
  to: string;
  body: string;
  meta: OutgoingMessagePayload['meta'];
  providerResult: ProviderResult;
  request?: any;
  response?: any;
};

/**
 * Represents the configuration for a single provider.
 */
export type ProviderConfig = {
  url?: string;
  token?: string;
  apiKey?: string;
  apiSecret?: string;
  numberId?: string;
  from?: string;
  applicationId?: string;
  fromNumber?: string;
  webhookVerifyToken?: string;
  username?: string;
  password?: string;
  wabaId?: string;
  appSecret?: string;
  authMethod?: string;  // Add authentication method support
  customAuthHeaders?: Record<string, string>;  // Add custom auth headers support
  userId?: string;     // Add userId support for APIs that require it
  userid?: string;     // Alternative spelling
  userID?: string;     // Alternative spelling
};

/**
 * Represents the structure for all provider configurations.
 */
export type AppConfig = {
  defaultProvider: Provider;
  apiNotificationUrl?: string;
  providers: {
    [key in Provider]?: ProviderConfig;
  };
};