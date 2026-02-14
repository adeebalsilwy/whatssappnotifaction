import { NextResponse } from 'next/server';
import { TemenosInboundSchema, extractUserId, mapTemenosToPayload } from '@/server/temenos';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';
import { logMessage } from '@/lib/logger';
import type { LogEntry } from '@/lib/types';
import getConfig from '@/config/providers';
import { saveInbound, saveMessage } from '@/lib/jsondb';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      errorCode: 'INVALID_JSON',
      errors: ['Request body is not valid JSON.'],
    }, { status: 400 });
  }

  const parsed = TemenosInboundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      errors: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    }, { status: 400 });
  }

  const inbound = parsed.data;
  const userId = extractUserId(request, inbound.userId);

  await saveInbound({ requestId, inbound, headers: { userIdFrom: userId ? 'provided' : 'missing' } }, requestId);

  const payload = mapTemenosToPayload(inbound, userId);
  const service = new WhatsAppNotificationService();
  const result = await service.send(payload);

  const appConfig = getConfig();
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    provider: payload.provider || appConfig.defaultProvider,
    to: payload.to,
    body: payload.body,
    meta: payload.meta,
    providerResult: result,
  };
  await logMessage(logEntry);

  await saveMessage({ requestId, payload, result }, requestId);

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
