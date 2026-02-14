import { NextResponse } from 'next/server';
import { insertApiLog, getMessageIdByProviderMessageId, updateMessageStatusByProviderId, insertMessageEvent } from '@/server/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Meta Status Webhook is active. Use POST to send status updates.',
    timestamp: new Date().toISOString()
  });
}

/**
 * Maps Meta's status values to our internal status values
 */
function mapStatus(metaStatus: string): string {
  const status = metaStatus?.toLowerCase();
  if (status === 'delivered') return 'DELIVERED';
  if (status === 'read' || status === 'seen') return 'SEEN';
  if (status === 'failed' || status === 'failed_perm' || status === 'failed_temp') return 'FAILED';
  if (status === 'sent') return 'SENT';
  if (status === 'accepted' || status === 'queued') return 'QUEUED';
  return 'OTHER';
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;

  let body: any = null;
  try {
    const cloned = request.clone();
    const rawBody = await cloned.text();
    const sigHeader = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET || '';

    if (appSecret) {
      const { verifyXHubSignature } = await import('@/lib/metaWebhook');
      const ok = verifyXHubSignature(sigHeader, rawBody, appSecret);
      if (!ok) {
        console.error('[Meta Webhook - Status] Signature verification failed', { sigHeader, requestId });
        return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      console.warn('[Meta Webhook - Status] META_APP_SECRET not set — skipping signature verification');
    }

    body = JSON.parse(rawBody || '{}');
  } catch {}

  // Process status updates from Meta
  if (body.entry && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleStatusUpdates(change.value, requestId);
          }
        }
      }
    }
  }

  try {
    await insertApiLog({
      requestId,
      endpoint: '/api/webhooks/meta/status',
      method: 'POST',
      requestHeadersMasked: {},
      requestBodyMasked: body,
      responseStatus: 200,
      responseBody: { ok: true, requestId },
      latencyMs: Date.now() - started,
      ip,
    });
  } catch {}

  return NextResponse.json({ ok: true, requestId });
}

/**
 * Handles message status updates from Meta
 */
async function handleStatusUpdates(value: any, requestId: string) {
  if (!value?.statuses) {
    return;
  }

  for (const status of value.statuses) {
    const providerMessageId = status.id;
    const statusValue = status.status;
    const deliveryStatus = statusValue ? mapStatus(statusValue) : 'OTHER';

    if (providerMessageId) {
      try {
        await updateMessageStatusByProviderId(providerMessageId, deliveryStatus);
        const messageId = await getMessageIdByProviderMessageId(providerMessageId);
        
        if (messageId) {
          await insertMessageEvent(messageId, 'status', {
            status: statusValue,
            mappedStatus: deliveryStatus,
            timestamp: status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
            recipientId: status.recipient_id,
            errors: status.errors,
            conversation: status.conversation,
            pricing: status.pricing
          });
        }

        console.log(`[Meta Webhook] Status updated for ${providerMessageId} to ${deliveryStatus}`);
      } catch (error) {
        console.error(`[Meta Webhook] Error updating status for ${providerMessageId}:`, error);
      }
    }
  }
}