/**
 * Utility functions for transaction ID generation and message tracking
 */

/**
 * Generates a unique transaction ID for failed messages
 * Format: timestamp + phone suffix + random component
 * @param phoneNumber The recipient phone number
 * @param prefix Optional prefix for the transaction ID
 * @returns Unique transaction ID
 */
export function generateTransactionId(phoneNumber: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const phoneSuffix = phoneNumber.replace(/[^\d]/g, '').slice(-6); // Last 6 digits
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${prefix}${timestamp}${phoneSuffix}${random}`;
}

/**
 * Generates a transaction ID specifically for failed messages
 * @param phoneNumber The recipient phone number
 * @param originalProvider The provider that originally failed
 * @returns Transaction ID for failed message tracking
 */
export function generateFailedMessageTransactionId(phoneNumber: string, originalProvider: string): string {
  return generateTransactionId(phoneNumber, `FAIL_${originalProvider.toUpperCase()}_`);
}

/**
 * Parses a transaction ID to extract information
 * @param transactionId The transaction ID to parse
 * @returns Parsed information or null if invalid format
 */
export function parseTransactionId(transactionId: string): {
  timestamp: number;
  phoneSuffix: string;
  random: string;
  prefix?: string;
} | null {
  // Regex pattern to match our transaction ID format
  const pattern = /^(?:([A-Z_]+)_)?(\d{13})(\d{6})(\d{3})$/;
  const match = transactionId.match(pattern);
  
  if (!match) return null;
  
  return {
    prefix: match[1] || undefined,
    timestamp: parseInt(match[2]),
    phoneSuffix: match[3],
    random: match[4]
  };
}

/**
 * Checks if a transaction ID indicates a failed message
 * @param transactionId The transaction ID to check
 * @returns True if this is a failed message transaction ID
 */
export function isFailedMessageTransactionId(transactionId: string): boolean {
  const parsed = parseTransactionId(transactionId);
  return parsed?.prefix?.startsWith('FAIL_') === true;
}

/**
 * Gets the original provider from a failed message transaction ID
 * @param transactionId The transaction ID to parse
 * @returns Original provider name or null
 */
export function getOriginalProviderFromTransactionId(transactionId: string): string | null {
  const parsed = parseTransactionId(transactionId);
  if (!parsed?.prefix?.startsWith('FAIL_')) return null;
  
  // Extract provider from FAIL_PROVIDER_ format
  const providerPart = parsed.prefix.replace('FAIL_', '').replace('_', '');
  return providerPart.toLowerCase();
}

/**
 * Formats phone number for SMS delivery
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumberForSms(phoneNumber: string): string {
  // Remove + and country code for Yemeni numbers
  // Convert +967774577134 to 774577134
  let formatted = phoneNumber.replace(/^\+/, '');
  if (formatted.startsWith('967')) {
    formatted = formatted.substring(3);
  }
  return formatted;
}

/**
 * Validates if a phone number is in correct Yemeni format
 * @param phoneNumber The phone number to validate
 * @returns True if valid Yemeni number
 */
export function isValidYemeniPhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digits and +
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check for Yemeni number patterns:
  // +967XXXXXXXXX or 967XXXXXXXXX or 0XXXXXXXXX or XXXXXXXXX
  const patterns = [
    /^\+967\d{9}$/,  // +967 followed by 9 digits
    /^967\d{9}$/,    // 967 followed by 9 digits
    /^0\d{9}$/,      // 0 followed by 9 digits
    /^\d{9}$/        // Exactly 9 digits
  ];
  
  return patterns.some(pattern => pattern.test(cleanNumber));
}

/**
 * Normalizes phone number to international format
 * @param phoneNumber The phone number to normalize
 * @returns Normalized phone number in +967XXXXXXXXX format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Handle different input formats
  if (cleanNumber.startsWith('+967')) {
    // Already in correct format
    return cleanNumber;
  } else if (cleanNumber.startsWith('967')) {
    // Missing +
    return '+' + cleanNumber;
  } else if (cleanNumber.startsWith('0')) {
    // Local format with 0 prefix
    return '+967' + cleanNumber.substring(1);
  } else if (/^\d{9}$/.test(cleanNumber)) {
    // Just the 9 digits
    return '+967' + cleanNumber;
  }
  
  // If we can't normalize, return original
  return phoneNumber;
}