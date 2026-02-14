import type { LogEntry, Provider } from '@/lib/types';
import { providers } from '@/lib/types';

const sampleBodies = [
  'تم تنفيذ عملية خصم من حسابك بمبلغ 100 SAR',
  'Your one-time password (OTP) is 123456.',
  'Credit card statement for May is now available.',
  'A transfer of 500 AED has been received.',
  'Your loan application has been approved.',
];

const eventTypes: LogEntry['meta']['eventType'][] = ['DEBIT', 'CREDIT', 'TRANSFER', 'OTHER'];

/**
 * Generates a specified number of mock log entries for the dashboard.
 * This is used as a fallback when log files are not available.
 * @param count The number of mock logs to generate.
 * @returns An array of mock LogEntry objects.
 */
export function generateMockLogs(count: number): LogEntry[] {
  const logs: LogEntry[] = [];

  for (let i = 0; i < count; i++) {
    const provider = providers[i % providers.length];
    const success = Math.random() > 0.15; // 85% success rate
    const now = new Date();
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(); // one log per hour

    const log: LogEntry = {
      timestamp: timestamp,
      provider,
      to: `+96777${Math.floor(1000000 + Math.random() * 9000000)}`,
      body: sampleBodies[i % sampleBodies.length],
      meta: {
        sourceSystem: 'T24',
        companyId: 'KSA',
        txnId: `FT-MOCK-${123456 + i}`,
        accountNo: `1000${(i % 100).toString().padStart(4, '0')}`,
        eventType: eventTypes[i % eventTypes.length],
        timestamp: timestamp,
      },
      providerResult: {
        success,
        provider,
        providerMessageId: success ? `wamid.mock.id.${1000 + i}` : undefined,
        rawResponse: success
          ? { messages: [{ id: `wamid.mock.id.${1000 + i}` }] }
          : { error: { message: 'Invalid phone number format.' } },
        errorCode: success ? undefined : 'PROVIDER_ERROR',
        errorMessage: success ? undefined : 'Invalid phone number format.',
      },
    };
    logs.push(log);
  }
  return logs;
}
