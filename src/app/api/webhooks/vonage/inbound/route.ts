import { NextResponse } from 'next/server';
import { insertApiLog, insertMessage, insertMessageEvent } from '@/server/repository';
import { logToFile } from '@/lib/logger';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Vonage Inbound Webhook is active. Use POST to receive messages.',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;

  // Log Raw Inbound Request
  try {
    const clonedReq = request.clone();
    const rawBody = await clonedReq.text();
    // We parse it again below, but getting text is safe for logging if JSON fails later
    await logToFile('vonage_debug', {
      action: 'INBOUND_WEBHOOK_RECEIVED',
      requestId,
      timestamp: new Date().toISOString(),
      ip
    });
  } catch (e) {
    console.error('[Vonage Webhook] Logging error', e);
  }

  // Verify Signature
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'Missing or invalid authorization header' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const signatureSecret = process.env.VONAGE_Signature || process.env.VONAGE_SIGNATURE_SECRET;

  if (signatureSecret) {
    try {
      jwt.verify(token, signatureSecret, { algorithms: ['HS256'] });
    } catch (err) {
      console.error('[Vonage Webhook] Invalid signature:', err);
      await logToFile('vonage_debug', {
        action: 'INBOUND_SIGNATURE_FAIL',
        requestId,
        error: err
      });
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 403 });
    }
  } else {
    console.warn('[Vonage Webhook] No signature secret found in env, skipping verification.');
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch { }

  const providerMessageId: string | undefined = body?.message_uuid || body?.messageUuid || body?.messageId || body?.message_id;
  const from: string | undefined = body?.from;
  const to: string | undefined = body?.to;
  const text: string | undefined = body?.text || body?.message?.text;

  try {
    if (to && text) {
      const messageId = await insertMessage({
        to,
        message: text,
        status: 'RECEIVED',
        providerMessageId,
      });
      await insertMessageEvent(messageId, 'inbound', body);

      await logToFile('vonage_debug', {
        action: 'INBOUND_MESSAGE_SAVED',
        requestId,
        messageId,
        to,
        from,
        text
      });
    }
  } catch { }

  try {
    await insertApiLog({
      requestId,
      endpoint: '/api/webhooks/vonage/inbound',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: body,
      responseStatus: 200,
      responseBody: { ok: true, requestId },
      latencyMs: Date.now() - started,
      ip,
    });
  } catch { }

  return NextResponse.json({ ok: true, requestId });
}

