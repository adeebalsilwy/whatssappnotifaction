import { promises as fs } from 'fs';
import path from 'path';
import type { AppConfig, Provider } from '@/lib/types';
import dotenv from 'dotenv';
import { getSettings as getSettingsFromSqlite } from '@/server/settingsRepo';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const configFilePath = path.join(process.cwd(), 'src', 'config', 'whatsapp-config.json');

type Maybe<T> = T | undefined | null;

/** Treat undefined/null/empty-string as "missing" */
function pick<T>(...values: Array<Maybe<T> | ''>): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

function pickStr(...values: Array<Maybe<string> | ''>): string {
  return pick<string>(...values) ?? '';
}

function pickProvider(...values: Array<Maybe<Provider> | ''>): Provider {
  return (pick<Provider>(...values) ?? 'meta') as Provider;
}

/** Default structure only (no forcing empty strings) */
export function getDefaultConfig(): AppConfig {
  return {
    defaultProvider: pickProvider(process.env.DEFAULT_PROVIDER as Provider, 'meta'),
    apiNotificationUrl: pickStr(process.env.APINOTIFICATION_URL, 'https://apinotification.firstaden-bank.com/'),
    providers: {
      meta: {
        url: pickStr(process.env.META_WHATSAPP_API_URL, 'https://graph.facebook.com/v24.0'),
        token: pickStr(process.env.META_WHATSAPP_TOKEN),
        numberId: pickStr(process.env.META_WHATSAPP_NUMBER_ID),
        webhookVerifyToken: pickStr(process.env.META_WEBHOOK_VERIFY_TOKEN),
        wabaId: pickStr(process.env.WABA_ID),
        appSecret: pickStr(process.env.META_APP_SECRET),
      },
      vonage: {
        url: pickStr(process.env.VONAGE_API_URL, 'https://messages-sandbox.nexmo.com/v1/messages'),
        apiKey: pickStr(process.env.VONAGE_API_KEY),
        apiSecret: pickStr(process.env.VONAGE_API_SECRET),
        from: pickStr(process.env.VONAGE_FROM_NUMBER),
        fromNumber: pickStr(process.env.VONAGE_FROM_NUMBER),
        applicationId: pickStr(process.env.VONAGE_APPLICATION_ID),
      },
      generic: {
        url: pickStr(process.env.GENERIC_WHATSAPP_URL),
        token: pickStr(process.env.GENERIC_WHATSAPP_TOKEN),
      },
      direct: {
        url: pickStr(process.env.DIRECT_WHATSAPP_URL),
        token: pickStr(process.env.DIRECT_WHATSAPP_TOKEN),
        from: pickStr(process.env.DIRECT_WHATSAPP_FROM, '967774577134'),
      },
      fad: {
        url: pickStr(process.env.FAD_API_URL, 'https://api.fad.ye/sms/send'),
        username: pickStr(process.env.FAD_USERNAME),
        password: pickStr(process.env.FAD_PASSWORD),
        authMethod: pickStr(process.env.FAD_AUTH_METHOD, 'basic'),
        customAuthHeaders: process.env.FAD_CUSTOM_AUTH_HEADERS ? JSON.parse(process.env.FAD_CUSTOM_AUTH_HEADERS) : undefined,
        userId: pickStr(process.env.FAD_USERID),
        userid: pickStr(process.env.FAD_USERID), // Same value for alternative spelling
        userID: pickStr(process.env.FAD_USERID), // Same value for alternative spelling
      },
    },
  };
}

export async function loadConfig(): Promise<AppConfig> {
  const defaults = getDefaultConfig();
  let fileConfig: Partial<AppConfig> = {};

  try {
    await fs.mkdir(path.dirname(configFilePath), { recursive: true });
    const fileContent = await fs.readFile(configFilePath, 'utf-8');
    fileConfig = JSON.parse(fileContent);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      console.log('Config file not found, creating a new one with default values.');
      await fs.writeFile(configFilePath, JSON.stringify(defaults, null, 2));
      fileConfig = defaults;
    } else {
      console.error('Failed to read or parse config file. Using defaults.', error);
    }
  }

  // Merge with priority: ENV (if not empty) > fileConfig > defaults
  const cfg: AppConfig = {
    ...defaults,
    ...fileConfig,
    apiNotificationUrl: pickStr(process.env.APINOTIFICATION_URL, fileConfig.apiNotificationUrl, defaults.apiNotificationUrl),
    defaultProvider: pickProvider(
      process.env.DEFAULT_PROVIDER as Provider,
      fileConfig.defaultProvider as Provider,
      defaults.defaultProvider
    ),
    providers: {
      meta: {
        ...defaults.providers.meta,
        ...fileConfig.providers?.meta,
        url: pickStr(process.env.META_WHATSAPP_API_URL, fileConfig.providers?.meta?.url, defaults.providers.meta!.url),
        token: pickStr(process.env.META_WHATSAPP_TOKEN, fileConfig.providers?.meta?.token, defaults.providers.meta!.token),
        numberId: pickStr(process.env.META_WHATSAPP_NUMBER_ID, fileConfig.providers?.meta?.numberId, defaults.providers.meta!.numberId),
        webhookVerifyToken: pickStr(process.env.META_WEBHOOK_VERIFY_TOKEN, fileConfig.providers?.meta?.webhookVerifyToken, defaults.providers.meta!.webhookVerifyToken),
        wabaId: pickStr(process.env.WABA_ID, fileConfig.providers?.meta?.wabaId, defaults.providers.meta!.wabaId),
        appSecret: pickStr(process.env.META_APP_SECRET, fileConfig.providers?.meta?.appSecret, defaults.providers.meta!.appSecret),
      },
      vonage: {
        ...defaults.providers.vonage,
        ...fileConfig.providers?.vonage,
        url: pickStr(process.env.VONAGE_API_URL, fileConfig.providers?.vonage?.url, defaults.providers.vonage!.url),
        apiKey: pickStr(process.env.VONAGE_API_KEY, fileConfig.providers?.vonage?.apiKey, defaults.providers.vonage!.apiKey),
        apiSecret: pickStr(process.env.VONAGE_API_SECRET, fileConfig.providers?.vonage?.apiSecret, defaults.providers.vonage!.apiSecret),
        applicationId: pickStr(process.env.VONAGE_APPLICATION_ID, fileConfig.providers?.vonage?.applicationId, defaults.providers.vonage!.applicationId),
        from: pickStr(process.env.VONAGE_FROM_NUMBER, fileConfig.providers?.vonage?.from, defaults.providers.vonage!.from),
        fromNumber: pickStr(process.env.VONAGE_FROM_NUMBER, fileConfig.providers?.vonage?.fromNumber, defaults.providers.vonage!.fromNumber),
      },
      generic: {
        ...defaults.providers.generic,
        ...fileConfig.providers?.generic,
        url: pickStr(process.env.GENERIC_WHATSAPP_URL, fileConfig.providers?.generic?.url, defaults.providers.generic!.url),
        token: pickStr(process.env.GENERIC_WHATSAPP_TOKEN, fileConfig.providers?.generic?.token, defaults.providers.generic!.token),
      },
      direct: {
        ...defaults.providers.direct,
        ...fileConfig.providers?.direct,
        url: pickStr(process.env.DIRECT_WHATSAPP_URL, fileConfig.providers?.direct?.url, defaults.providers.direct!.url),
        token: pickStr(process.env.DIRECT_WHATSAPP_TOKEN, fileConfig.providers?.direct?.token, defaults.providers.direct!.token),
        from: pickStr(process.env.DIRECT_WHATSAPP_FROM, fileConfig.providers?.direct?.from, defaults.providers.direct!.from),
      },
      fad: {
        ...defaults.providers.fad,
        ...fileConfig.providers?.fad,
        url: pickStr(process.env.FAD_API_URL, fileConfig.providers?.fad?.url, defaults.providers.fad!.url),
        username: pickStr(process.env.FAD_USERNAME, fileConfig.providers?.fad?.username, defaults.providers.fad!.username),
        password: pickStr(process.env.FAD_PASSWORD, fileConfig.providers?.fad?.password, defaults.providers.fad!.password),
        authMethod: pickStr(process.env.FAD_AUTH_METHOD, fileConfig.providers?.fad?.authMethod, defaults.providers.fad!.authMethod),
        customAuthHeaders: process.env.FAD_CUSTOM_AUTH_HEADERS ? JSON.parse(process.env.FAD_CUSTOM_AUTH_HEADERS) : 
                          fileConfig.providers?.fad?.customAuthHeaders || defaults.providers.fad!.customAuthHeaders,
        userId: pickStr(process.env.FAD_USERID, fileConfig.providers?.fad?.userId, defaults.providers.fad!.userId),
        userid: pickStr(process.env.FAD_USERID, fileConfig.providers?.fad?.userid, defaults.providers.fad!.userid),
        userID: pickStr(process.env.FAD_USERID, fileConfig.providers?.fad?.userID, defaults.providers.fad!.userID),
      },
    },
  };

  return cfg;
}

export function loadConfigSync(): AppConfig {
  const defaults = getDefaultConfig();
  let sqliteConfig: AppConfig | null = null;

  try {
    sqliteConfig = getSettingsFromSqlite();
  } catch {}

  const cfg: AppConfig = {
    ...defaults,
    ...(sqliteConfig || {}),
    apiNotificationUrl: pickStr(process.env.APINOTIFICATION_URL, sqliteConfig?.apiNotificationUrl, defaults.apiNotificationUrl),
    defaultProvider: pickProvider(
      process.env.DEFAULT_PROVIDER as Provider,
      sqliteConfig?.defaultProvider as Provider,
      defaults.defaultProvider
    ),
    providers: {
      meta: {
        ...defaults.providers.meta,
        ...(sqliteConfig?.providers?.meta || {}),
        url: pickStr(process.env.META_WHATSAPP_API_URL, sqliteConfig?.providers?.meta?.url, defaults.providers.meta!.url),
        token: pickStr(process.env.META_WHATSAPP_TOKEN, sqliteConfig?.providers?.meta?.token, defaults.providers.meta!.token),
        numberId: pickStr(process.env.META_WHATSAPP_NUMBER_ID, sqliteConfig?.providers?.meta?.numberId, defaults.providers.meta!.numberId),
        webhookVerifyToken: pickStr(process.env.META_WEBHOOK_VERIFY_TOKEN, sqliteConfig?.providers?.meta?.webhookVerifyToken, defaults.providers.meta!.webhookVerifyToken),
        wabaId: pickStr(process.env.WABA_ID, sqliteConfig?.providers?.meta?.wabaId, defaults.providers.meta!.wabaId),
        appSecret: pickStr(process.env.META_APP_SECRET, sqliteConfig?.providers?.meta?.appSecret, defaults.providers.meta!.appSecret),
      },
      vonage: {
        ...defaults.providers.vonage,
        ...(sqliteConfig?.providers?.vonage || {}),
        url: pickStr(process.env.VONAGE_API_URL, sqliteConfig?.providers?.vonage?.url, defaults.providers.vonage!.url),
        apiKey: pickStr(process.env.VONAGE_API_KEY, sqliteConfig?.providers?.vonage?.apiKey, defaults.providers.vonage!.apiKey),
        apiSecret: pickStr(process.env.VONAGE_API_SECRET, sqliteConfig?.providers?.vonage?.apiSecret, defaults.providers.vonage!.apiSecret),
        applicationId: pickStr(process.env.VONAGE_APPLICATION_ID, sqliteConfig?.providers?.vonage?.applicationId, defaults.providers.vonage!.applicationId),
        from: pickStr(process.env.VONAGE_FROM_NUMBER, sqliteConfig?.providers?.vonage?.from, defaults.providers.vonage!.from),
        fromNumber: pickStr(process.env.VONAGE_FROM_NUMBER, sqliteConfig?.providers?.vonage?.fromNumber, defaults.providers.vonage!.fromNumber),
      },
      generic: {
        ...defaults.providers.generic,
        ...(sqliteConfig?.providers?.generic || {}),
        url: pickStr(process.env.GENERIC_WHATSAPP_URL, sqliteConfig?.providers?.generic?.url, defaults.providers.generic!.url),
        token: pickStr(process.env.GENERIC_WHATSAPP_TOKEN, sqliteConfig?.providers?.generic?.token, defaults.providers.generic!.token),
      },
      direct: {
        ...defaults.providers.direct,
        ...(sqliteConfig?.providers?.direct || {}),
        url: pickStr(process.env.DIRECT_WHATSAPP_URL, sqliteConfig?.providers?.direct?.url, defaults.providers.direct!.url),
        token: pickStr(process.env.DIRECT_WHATSAPP_TOKEN, sqliteConfig?.providers?.direct?.token, defaults.providers.direct!.token),
        from: pickStr(process.env.DIRECT_WHATSAPP_FROM, sqliteConfig?.providers?.direct?.from, defaults.providers.direct!.from),
      },
      fad: {
        ...defaults.providers.fad,
        ...(sqliteConfig?.providers?.fad || {}),
        url: pickStr(process.env.FAD_API_URL, sqliteConfig?.providers?.fad?.url, defaults.providers.fad!.url),
        username: pickStr(process.env.FAD_USERNAME, sqliteConfig?.providers?.fad?.username, defaults.providers.fad!.username),
        password: pickStr(process.env.FAD_PASSWORD, sqliteConfig?.providers?.fad?.password, defaults.providers.fad!.password),
        authMethod: pickStr(process.env.FAD_AUTH_METHOD, sqliteConfig?.providers?.fad?.authMethod, defaults.providers.fad!.authMethod),
        customAuthHeaders: process.env.FAD_CUSTOM_AUTH_HEADERS ? JSON.parse(process.env.FAD_CUSTOM_AUTH_HEADERS) :
                          sqliteConfig?.providers?.fad?.customAuthHeaders || defaults.providers.fad!.customAuthHeaders,
        userId: pickStr(process.env.FAD_USERID, sqliteConfig?.providers?.fad?.userId, defaults.providers.fad!.userId),
        userid: pickStr(process.env.FAD_USERID, sqliteConfig?.providers?.fad?.userid, defaults.providers.fad!.userid),
        userID: pickStr(process.env.FAD_USERID, sqliteConfig?.providers?.fad?.userID, defaults.providers.fad!.userID),
      },
    },
  };

  return cfg;
}