import { NextResponse } from 'next/server';
import { insertApiLog, insertMessage, insertMessageEvent } from '@/server/repository';
import { logToFile } from '@/lib/logger';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Meta Inbound Webhook is active. Use POST to receive messages.',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;

  // Read raw body and verify signature
  let rawBody = '';
  try {
    const clonedReq = request.clone();
    rawBody = await clonedReq.text();
    const sigHeader = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET || '';

    if (appSecret) {
      const { verifyXHubSignature } = await import('@/lib/metaWebhook');
      const ok = verifyXHubSignature(sigHeader, rawBody, appSecret);
      if (!ok) {
        console.error('[Meta Webhook] Signature verification failed', { sigHeader, requestId });
        return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      console.warn('[Meta Webhook] META_APP_SECRET not set — skipping signature verification');
    }

    await logToFile('meta_debug', {
      action: 'INBOUND_WEBHOOK_RECEIVED',
      requestId,
      timestamp: new Date().toISOString(),
      ip,
      rawBody: rawBody.substring(0, 1000) // Limit log size
    });
  } catch (e) {
    console.error('[Meta Webhook] Logging error', e);
  }

  let body: any = null;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {}

  // Handle different types of webhook events from Meta
  if (body.entry && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleMessagesChange(change.value, requestId);
          }
        }
      }
    }
  }

  try {
    await insertApiLog({
      requestId,
      endpoint: '/api/webhooks/meta/inbound',
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
 * Handles the messages change event from Meta
 */
async function handleMessagesChange(value: any, requestId: string) {
  if (!value?.messages) {
    return;
  }

  for (const message of value.messages) {
    const messageType = message.type;
    const sender = message.from;
    const timestamp = message.timestamp;
    let content = '';

    // Extract message content based on type
    switch (messageType) {
      case 'text':
        content = message.text?.body || '';
        break;
      case 'image':
        content = `[Image message: ${message.image?.caption || 'No caption'}]`;
        break;
      case 'document':
        content = `[Document: ${message.document?.filename || 'File'}]`;
        break;
      case 'audio':
        content = '[Audio message]';
        break;
      case 'video':
        content = `[Video message: ${message.video?.caption || 'No caption'}]`;
        break;
      case 'location':
        content = `[Location: ${message.location?.name || 'Shared location'}]`;
        break;
      case 'contacts':
        content = '[Contact information shared]';
        break;
      case 'interactive':
        content = `[Interactive message: ${message.interactive?.type}]`;
        break;
      default:
        content = `[${messageType} message]`;
    }

    // Process the inbound message
    await processInboundMessage({
      from: sender,
      to: value?.metadata?.display_phone_number,
      type: messageType,
      content: content,
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      messageId: message.id,
      requestId: requestId
    });
    
    // Use the notification service to process the incoming message
    try {
      const service = new WhatsAppNotificationService();
      await service.processIncomingMessage('meta', {
        from: sender,
        to: value?.metadata?.display_phone_number,
        type: messageType,
        content: content,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
        messageId: message.id,
        requestId: requestId
      });
    } catch (error) {
      console.error('[Meta Webhook] Error using notification service:', error);
    }
  }
}

/**
 * Processes an inbound message
 */
async function processInboundMessage(messageData: {
  from: string;
  to: string;
  type: string;
  content: string;
  timestamp: string;
  messageId: string;
  requestId: string;
}) {
  try {
    // Save the inbound message to the database
    const messageId = await insertMessage({
      to: messageData.from, // Since it's inbound, the "to" is actually the sender
      message: messageData.content,
      status: 'RECEIVED',
      providerMessageId: messageData.messageId,
      metadata: {
        source: 'meta',
        type: messageData.type,
        originalFrom: messageData.from,
        originalTo: messageData.to,
        timestamp: messageData.timestamp
      }
    });

    // Insert the event
    await insertMessageEvent(messageId, 'inbound', {
      ...messageData,
      direction: 'inbound'
    });

    console.log(`[Meta Webhook] Inbound message saved with ID: ${messageId}`);
  } catch (error) {
    console.error('[Meta Webhook] Error saving inbound message:', error);
  }
}