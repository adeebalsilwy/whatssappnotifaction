import { z } from 'zod';
import type { OutgoingMessagePayload } from '@/lib/types';

export const TemenosInboundSchema = z.object({
  message: z.string().min(1, 'message is required'),
  mobileNo: z.string().min(5, 'mobileNo is required'),
  userId: z.string().optional(),
});

export type TemenosInbound = z.infer<typeof TemenosInboundSchema>;

export function extractUserId(request: Request, bodyUserId?: string): string | undefined {
  const headers = request.headers;
  const hUser = headers.get('X-UserId') || headers.get('UserId');
  let qUser: string | undefined;
  try {
    const url = new URL(request.url);
    qUser = url.searchParams.get('UserId') || undefined;
  } catch {
    qUser = undefined;
  }
  return bodyUserId || hUser || qUser || undefined;
}

export function mapTemenosToPayload(input: TemenosInbound, userId?: string): OutgoingMessagePayload {
  return {
    provider: undefined,
    messageType: 'TEXT',
    to: input.mobileNo,
    from: userId,
    body: input.message,
    meta: {
      sourceSystem: 'Temenos',
      companyId: 'DEFAULT',
      txnId: crypto.randomUUID(),
      accountNo: 'N/A',
      eventType: 'OTHER',
      timestamp: new Date().toISOString(),
    },
  };
}
