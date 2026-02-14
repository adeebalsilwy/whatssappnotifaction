import { NextResponse } from 'next/server';
import { insertApiLog, getMessageIdByProviderMessageId, updateMessageStatusByProviderId, insertMessageEvent } from '@/server/repository';

export const dynamic = 'force-dynamic';

function mapStatus(s: string): string {
  const v = s?.toLowerCase();
  if (v === 'delivered') return 'DELIVERED';
  if (v === 'seen') return 'SEEN';
  if (v === 'failed' || v === 'rejected' || v === 'undeliverable') return 'FAILED';
  if (v === 'accepted' || v === 'queued' || v === 'submitted' || v === 'sent') return 'SENT';
  return 'OTHER';
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;
  let body: any = null;
  try {
    body = await request.json();
  } catch {}

  const providerMessageId: string | undefined = body?.message_uuid || body?.messageUuid || body?.messageId || body?.message_id;
  const statusRaw: string | undefined = body?.status || body?.message_status || body?.messageStatus;
  let deliveryStatus = statusRaw ? mapStatus(statusRaw) : 'OTHER';

  if (providerMessageId) {
    try {
      await updateMessageStatusByProviderId(providerMessageId, deliveryStatus);
      const messageId = await getMessageIdByProviderMessageId(providerMessageId);
      if (messageId) {
        await insertMessageEvent(messageId, 'status', body);
      }
    } catch {}
  }

  await insertApiLog({
    requestId,
    endpoint: '/v1/whatsapp/webhook/status',
    method: 'POST',
    requestHeadersMasked: { authorization: '***' },
    requestBodyMasked: body,
    responseStatus: 200,
    responseBody: { ok: true, requestId, deliveryStatus },
    latencyMs: Date.now() - started,
    ip,
  });

  return NextResponse.json({ ok: true, requestId, deliveryStatus });
}

