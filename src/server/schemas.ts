import { z } from 'zod';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const MetadataSchema = z.object({
  customerId: z.string().optional(),
  channel: z.string().optional(),
  requestSource: z.string().optional(),
}).passthrough();

export const MessageRequestSchema = z.object({
  to: z.union([
    z.string().regex(E164_REGEX, 'Invalid E.164 number'),
    z.array(z.string().regex(E164_REGEX, 'Invalid E.164 number')).min(1),
  ]).optional(),
  recipients: z.array(z.string().regex(E164_REGEX, 'Invalid E.164 number')).min(1).optional(),
  message: z.string().min(1, 'Message must not be empty').max(1000, 'Message too long'),
  sender: z.string().min(1).max(64),
  referenceId: z.string().min(1).max(64),
  priority: z.enum(['LOW','NORMAL','HIGH']).optional(),
  metadata: MetadataSchema.optional(),
});

export type MessageRequest = z.infer<typeof MessageRequestSchema>;

export function normalizeRecipients(input: MessageRequest): string[] {
  if (Array.isArray(input.recipients)) return input.recipients;
  if (typeof input.to === 'string') return [input.to];
  if (Array.isArray(input.to)) return input.to;
  return [];
}
