import { NextResponse } from 'next/server';
import { initDb } from '@/server/db';
import { insertApiLog, insertMessage, insertMessageEvent } from '@/server/repository';
import { authenticate } from '@/server/security';
import { checkRateLimit } from '@/server/rateLimit';
import { MessageRequestSchema, normalizeRecipients } from '@/server/schemas';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';
import type { OutgoingMessagePayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

let dbReady: Promise<void> | null = null;

export async function POST(request: Request) {
  if (!dbReady) dbReady = initDb();
  await dbReady;

  const started = Date.now();
  const requestId = crypto.randomUUID();
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0] || '';
  const authHeader = request.headers.get('authorization') || undefined;

  const auth = authenticate(authHeader);
  if (!auth.ok) {
    await insertApiLog({
      requestId,
      endpoint: '/v1/whatsapp/messages',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: null,
      responseStatus: 401,
      responseBody: { status: 'FAILED', errorCode: 'UNAUTHORIZED', errorMessage: auth.error },
      latencyMs: Date.now() - started,
      ip,
    });
    return NextResponse.json({ status: 'FAILED', requestId, errorCode: 'UNAUTHORIZED', errorMessage: auth.error }, { status: 401 });
  }

  const rate = checkRateLimit(auth.clientId);
  if (!rate.ok) {
    await insertApiLog({
      requestId,
      endpoint: '/v1/whatsapp/messages',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: null,
      responseStatus: 429,
      responseBody: { status: 'FAILED', errorCode: 'RATE_LIMIT', errorMessage: 'Too Many Requests' },
      latencyMs: Date.now() - started,
      ip,
    });
    return new NextResponse(
      JSON.stringify({ status: 'FAILED', requestId, errorCode: 'RATE_LIMIT', errorMessage: 'Too Many Requests', retryAfter: rate.retryAfter }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rate.retryAfter) } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    await insertApiLog({
      requestId,
      endpoint: '/v1/whatsapp/messages',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: null,
      responseStatus: 400,
      responseBody: { status: 'FAILED', errorCode: 'INVALID_JSON', errorMessage: 'Invalid JSON' },
      latencyMs: Date.now() - started,
      ip,
    });
    return NextResponse.json({ status: 'FAILED', requestId, errorCode: 'INVALID_JSON', errorMessage: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = MessageRequestSchema.safeParse(body);
  if (!parsed.success) {
    await insertApiLog({
      requestId,
      endpoint: '/v1/whatsapp/messages',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: maskBody(body),
      responseStatus: 400,
      responseBody: { status: 'FAILED', errorCode: 'VALIDATION_ERROR', errors: parsed.error.errors },
      latencyMs: Date.now() - started,
      ip,
    });
    return NextResponse.json({ status: 'FAILED', requestId, errorCode: 'VALIDATION_ERROR', errors: parsed.error.errors }, { status: 400 });
  }

  const req = parsed.data;
  const recipients = normalizeRecipients(req);
  const service = new WhatsAppNotificationService();
  const results: any[] = [];

  for (const to of recipients) {
    const payload: OutgoingMessagePayload = {
      messageType: 'TEXT',
      to,
      from: req.sender,
      body: req.message,
      meta: {
        sourceSystem: req.metadata?.requestSource || 'API',
        companyId: req.metadata?.channel || 'DEFAULT',
        txnId: req.referenceId,
        accountNo: req.metadata?.customerId || 'N/A',
        eventType: 'OTHER',
        timestamp: new Date().toISOString(),
      },
    };

    const providerResult = await service.send(payload);
    const status = providerResult.success ? 'QUEUED' : 'FAILED';
    const messageId = await insertMessage({
      referenceId: req.referenceId,
      sender: req.sender,
      to,
      message: req.message,
      status,
      providerMessageId: providerResult.providerMessageId,
      priority: req.priority,
      metadata: req.metadata,
    });
    await insertMessageEvent(messageId, providerResult.success ? 'sent' : 'failed', providerResult.rawResponse);
    results.push({ to, messageId: providerResult.providerMessageId || `MSG-${messageId}`, deliveryStatus: status });
  }

  const response = { status: 'SUCCESS', requestId, results };
  await insertApiLog({
    requestId,
    endpoint: '/v1/whatsapp/messages',
    method: 'POST',
    requestHeadersMasked: { authorization: '***' },
    requestBodyMasked: maskBody(body),
    responseStatus: 200,
    responseBody: response,
    latencyMs: Date.now() - started,
    ip,
  });

  return NextResponse.json(response, { status: 200 });
}

function maskBody(body: any) {
  if (!body || typeof body !== 'object') return null;
  const copy = { ...body };
  if (typeof copy.to === 'string') copy.to = '***';
  if (Array.isArray(copy.to)) copy.to = copy.to.map(() => '***');
  if (Array.isArray(copy.recipients)) copy.recipients = copy.recipients.map(() => '***');
  if (typeof copy.message === 'string') copy.message = '***';
  return copy;
}
