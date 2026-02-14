import { NextResponse } from 'next/server';
import { insertApiLog, getMessageIdByProviderMessageId, updateMessageStatusByProviderId, insertMessageEvent } from '@/server/repository';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Vonage Status Webhook is active. Use POST to send status updates.',
    timestamp: new Date().toISOString()
  });
}

function mapStatus(s: string): string {
  const v = s?.toLowerCase();
  if (v === 'delivered') return 'DELIVERED';
  if (v === 'seen' || v === 'read') return 'SEEN';
  if (v === 'failed' || v === 'rejected' || v === 'undeliverable') return 'FAILED';
  if (v === 'accepted' || v === 'queued' || v === 'submitted' || v === 'sent') return 'SENT';
  return 'OTHER';
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;

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
      console.error('[Vonage Status Webhook] Invalid signature:', err);
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 403 });
    }
  } else {
    console.warn('[Vonage Status Webhook] No signature secret found in env, skipping verification.');
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch { }

  const providerMessageId: string | undefined = body?.message_uuid || body?.messageUuid || body?.messageId || body?.message_id;
  const statusRaw: string | undefined = body?.status || body?.message_status || body?.messageStatus;
  const deliveryStatus = statusRaw ? mapStatus(statusRaw) : 'OTHER';

  if (providerMessageId) {
    try {
      await updateMessageStatusByProviderId(providerMessageId, deliveryStatus);
      const messageId = await getMessageIdByProviderMessageId(providerMessageId);
      if (messageId) {
        await insertMessageEvent(messageId, 'status', body);
      }
    } catch { }
  }

  try {
    await insertApiLog({
      requestId,
      endpoint: '/api/webhooks/vonage/status',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: body,
      responseStatus: 200,
      responseBody: { ok: true, requestId, deliveryStatus },
      latencyMs: Date.now() - started,
      ip,
    });
  } catch { }

  return NextResponse.json({ ok: true, requestId, deliveryStatus });
}
