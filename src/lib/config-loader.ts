import { promises as fs } from 'fs';
import path from 'path';
import type { AppConfig, Provider } from '@/lib/types';
import dotenv from 'dotenv';
import { getSettings as getSettingsFromSqlite, upsertSettings as upsertSettingsToSqlite } from '@/server/settingsRepo';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const configFilePath = path.join(process.cwd(), 'src', 'config', 'whatsapp-config.json');

/**
 * Provides a default configuration structure.
 * This is used as a fallback if the config file doesn't exist or is invalid.
 * It's also used to create the initial config file.
 * It prioritizes environment variables over hardcoded values.
 */
export function getDefaultConfig(): AppConfig {
  return {
    defaultProvider: (process.env.DEFAULT_PROVIDER as Provider) || 'meta',
    apiNotificationUrl: process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com/',
    providers: {
      meta: {
        url: process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v20.0',
        token: process.env.META_WHATSAPP_TOKEN || '',
        numberId: process.env.META_WHATSAPP_NUMBER_ID || '',
        webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
      },
      vonage: {
        url: process.env.VONAGE_API_URL || 'https://messages-sandbox.nexmo.com/v1/messages',
        apiKey: process.env.VONAGE_API_KEY || '82f67722',
        apiSecret: process.env.VONAGE_API_SECRET || 'bd8T07s2n@e@2zN2Q!J',
        from: process.env.VONAGE_FROM_NUMBER || '967774577134',
        fromNumber: process.env.VONAGE_FROM_NUMBER || '967774577134',
      },
      generic: {
        url: process.env.GENERIC_WHATSAPP_URL || '',
        token: process.env.GENERIC_WHATSAPP_TOKEN || '',
      },
      direct: {
        url: process.env.DIRECT_WHATSAPP_URL || '',
        token: process.env.DIRECT_WHATSAPP_TOKEN || '',
        from: process.env.DIRECT_WHATSAPP_FROM || '967774577134',
      },
    },
  };
}

/**
 * Loads the application configuration. It follows a layered approach:
 * 1. Load default values.
 * 2. Override with values from the JSON config file.
 * 3. Override with values from environment variables (highest priority).
 * This ensures that environment variables always take precedence for security.
 * @returns A promise that resolves to the final AppConfig object.
 */
export async function loadConfig(): Promise<AppConfig> {
  const defaultConfig = getDefaultConfig();
  let fileConfig: Partial<AppConfig> = {};

  try {
    // Try to read the existing config file
    await fs.mkdir(path.dirname(configFilePath), { recursive: true });
    const fileContent = await fs.readFile(configFilePath, 'utf-8');
    fileConfig = JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // Config file doesn't exist, create it with defaults.
      console.log('Config file not found, creating a new one with default values.');
      await fs.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 2));
      fileConfig = defaultConfig;
    } else {
      // Other error reading file, log it but continue with defaults.
      console.error('Failed to read or parse config file. Using default config.', error);
    }
  }

  // Deep merge configs: defaults < fileConfig < env variables
  // Note: This merge logic gives precedence to env vars loaded in getDefaultConfig.
  const mergedConfig: AppConfig = {
    ...defaultConfig,
    ...fileConfig,
    apiNotificationUrl: process.env.APINOTIFICATION_URL || fileConfig.apiNotificationUrl || defaultConfig.apiNotificationUrl,
    defaultProvider: (process.env.DEFAULT_PROVIDER as Provider) || fileConfig.defaultProvider || defaultConfig.defaultProvider,
    providers: {
      meta: { ...defaultConfig.providers.meta, ...fileConfig.providers?.meta },
      vonage: { ...defaultConfig.providers.vonage, ...fileConfig.providers?.vonage },
      generic: { ...defaultConfig.providers.generic, ...fileConfig.providers?.generic },
      direct: { ...defaultConfig.providers.direct, ...fileConfig.providers?.direct },
    },
  }; 

  // Ensure env vars always win for sensitive fields
  mergedConfig.providers.meta!.token = process.env.META_WHATSAPP_TOKEN ?? mergedConfig.providers.meta!.token;
  mergedConfig.providers.vonage!.apiKey = process.env.VONAGE_API_KEY ?? mergedConfig.providers.vonage!.apiKey;
  mergedConfig.providers.vonage!.apiSecret = process.env.VONAGE_API_SECRET ?? mergedConfig.providers.vonage!.apiSecret;
  mergedConfig.providers.generic!.token = process.env.GENERIC_WHATSAPP_TOKEN ?? mergedConfig.providers.generic!.token;
  mergedConfig.providers.direct!.token = process.env.DIRECT_WHATSAPP_TOKEN ?? mergedConfig.providers.direct!.token;
  mergedConfig.apiNotificationUrl = process.env.APINOTIFICATION_URL ?? mergedConfig.apiNotificationUrl; 

  return mergedConfig;
}

export function loadConfigSync(): AppConfig {
  const defaultConfig = getDefaultConfig();
  let sqliteConfig: AppConfig | null = null;
  try {
    sqliteConfig = getSettingsFromSqlite();
  } catch { }
  const merged: AppConfig = {
    ...defaultConfig,
    ...(sqliteConfig || {}),
    apiNotificationUrl: process.env.APINOTIFICATION_URL || sqliteConfig?.apiNotificationUrl || defaultConfig.apiNotificationUrl,
    defaultProvider: (process.env.DEFAULT_PROVIDER as Provider) || sqliteConfig?.defaultProvider || defaultConfig.defaultProvider,
    providers: {
      meta: { ...defaultConfig.providers.meta, ...(sqliteConfig?.providers.meta || {}) },
      vonage: { ...defaultConfig.providers.vonage, ...(sqliteConfig?.providers.vonage || {}) },
      generic: { ...defaultConfig.providers.generic, ...(sqliteConfig?.providers.generic || {}) },
      direct: { ...defaultConfig.providers.direct, ...(sqliteConfig?.providers.direct || {}) },
    },
  }; 
  merged.providers.meta!.token = process.env.META_WHATSAPP_TOKEN ?? merged.providers.meta!.token;
  merged.providers.vonage!.apiKey = process.env.VONAGE_API_KEY ?? merged.providers.vonage!.apiKey;
  merged.providers.vonage!.apiSecret = process.env.VONAGE_API_SECRET ?? merged.providers.vonage!.apiSecret;
  merged.providers.generic!.token = process.env.GENERIC_WHATSAPP_TOKEN ?? merged.providers.generic!.token;
  merged.providers.direct!.token = process.env.DIRECT_WHATSAPP_TOKEN ?? merged.providers.direct!.token;
  merged.apiNotificationUrl = process.env.APINOTIFICATION_URL ?? merged.apiNotificationUrl;
  return merged;
}
