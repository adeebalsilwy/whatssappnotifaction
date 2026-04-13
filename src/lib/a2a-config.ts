/**
 * A2A Configuration service to manage A2A provider settings
 */

export interface A2AConfig {
  host: string;
  port: string;
  apiUrl: string;
  srvID: string;
  userId: string;
  password: string;
  channel: string;
  bankCodeHeader: string;
  bankCode: string;
  sender: string;
  connectorID: string;
  smsServer: {
    host: string;
    port: string;
    apiUrl: string;
    username: string;
    password: string;
    userId: string;
  };
}

/**
 * Load A2A Live configuration from environment variables or use defaults
 */
export function loadA2ALiveConfig(): A2AConfig {
  return {
    host: process.env.A2A_LIVE_HOST || 'A2A-SMS-CONNECTOR.mepspay.com',
    port: process.env.A2A_LIVE_PORT || '9312',
    apiUrl: process.env.A2A_LIVE_API_URL || '/wsGetMailsNotification/API/A2A/GetbankNotificationsList',
    srvID: process.env.A2A_LIVE_SRV_ID || '1',
    userId: process.env.A2A_LIVE_USER_ID || 'User',
    password: process.env.A2A_LIVE_PASSWORD || '123',
    channel: process.env.A2A_LIVE_CHANNEL || 'MW',
    bankCodeHeader: process.env.A2A_LIVE_BANK_CODE_HEADER || 'A2A',
    bankCode: process.env.A2A_LIVE_BANK_CODE || '1030200',
    sender: process.env.A2A_LIVE_SENDER || 'FADBank',
    connectorID: process.env.A2A_LIVE_CONNECTOR_ID || 'EN',
    smsServer: {
      host: process.env.A2A_SMS_HOST || '10.220.172.100',
      port: process.env.A2A_SMS_PORT || '7070',
      apiUrl: process.env.A2A_SMS_API_URL || '/API/Service/Interface/v3/SendSMS',
      username: process.env.A2A_SMS_USERNAME || 'Bank',
      password: process.env.A2A_SMS_PASSWORD || 'Bank@2024',
      userId: process.env.A2A_SMS_USER_ID || '124985',
    }
  };
}

/**
 * Load A2A Test configuration from environment variables or use defaults
 */
export function loadA2ATestConfig(): A2AConfig {
  return {
    host: process.env.A2A_TEST_HOST || '172.125.65.7',
    port: process.env.A2A_TEST_PORT || '8086',
    apiUrl: process.env.A2A_TEST_API_URL || '/wsGetMailsNotification/API/A2A/GetbankNotificationsList/',
    srvID: process.env.A2A_TEST_SRV_ID || '1',
    userId: process.env.A2A_TEST_USER_ID || 'User',
    password: process.env.A2A_TEST_PASSWORD || '123',
    channel: process.env.A2A_TEST_CHANNEL || 'MW',
    bankCodeHeader: process.env.A2A_TEST_BANK_CODE_HEADER || 'A2A',
    bankCode: process.env.A2A_TEST_BANK_CODE || '1029420',
    sender: process.env.A2A_TEST_SENDER || 'FADBank',
    connectorID: process.env.A2A_TEST_CONNECTOR_ID || 'EN',
    smsServer: {
      host: process.env.A2A_SMS_HOST || '10.220.172.100',
      port: process.env.A2A_SMS_PORT || '7070',
      apiUrl: process.env.A2A_SMS_API_URL || '/API/Service/Interface/v3/SendSMS',
      username: process.env.A2A_SMS_USERNAME || 'Bank',
      password: process.env.A2A_SMS_PASSWORD || 'Bank@2024',
      userId: process.env.A2A_SMS_USER_ID || '124985',
    }
  };
}

/**
 * Load A2A configuration based on environment mode (live/test)
 */
export function loadA2AConfig(mode: 'live' | 'test' = 'live'): A2AConfig {
  // If mode is explicitly passed, use it; otherwise, check environment variable
  const selectedMode = mode || (process.env.A2A_MODE === 'test' ? 'test' : 'live');
  
  return selectedMode === 'test' ? loadA2ATestConfig() : loadA2ALiveConfig();
}

/**
 * Validate A2A configuration
 */
export function validateA2AConfig(config: A2AConfig): boolean {
  // Basic validation checks
  if (!config.host || !config.port || !config.userId || !config.password) {
    console.error('A2A configuration validation failed: Missing required fields');
    return false;
  }

  // Validate port is numeric
  if (isNaN(Number(config.port))) {
    console.error('A2A configuration validation failed: Port must be a number');
    return false;
  }

  // Validate SMS server port is numeric
  if (isNaN(Number(config.smsServer.port))) {
    console.error('A2A configuration validation failed: SMS server port must be a number');
    return false;
  }

  return true;
}