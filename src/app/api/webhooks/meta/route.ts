import { NextResponse } from 'next/server';
import { insertApiLog, insertMessage, insertMessageEvent, updateMessageStatusByProviderId, getMessageIdByProviderMessageId } from '@/server/repository';
import { logToFile } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Handles Meta WhatsApp webhook verification and incoming messages
 * For verification: GET request with hub.challenge parameter
 * For messages: POST request with JSON payload
 */
import { getAllowedVerifyTokens } from '@/lib/metaWebhook';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    // Verify that this is a legitimate verification request
    const allowedTokens = getAllowedVerifyTokens();

    if (mode === 'subscribe' && token && allowedTokens.includes(token)) {
      console.log(`[Meta Webhook] Verification successful for token: ${token}`);
      // Meta requires the response to be exactly the challenge string with a 200 status
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.error('[Meta Webhook] Verification failed', { mode, token, allowedTokens });
      return new Response('Verification token mismatch', { status: 403 });
    }
  } catch (error) {
    console.error('[Meta Webhook] Verification error:', error);
    return new Response('Verification error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;

  try {
    // Read raw body for signature verification
    const cloned = request.clone();
    const rawBody = await cloned.text();
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

    const body = JSON.parse(rawBody || '{}');

    console.log('[Meta Webhook] Inbound message received:', JSON.stringify(body, null, 2));

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

    // Log the webhook event
    await logWebhookEvent(body, requestId);

    return NextResponse.json({ 
      ok: true, 
      requestId,
      message: 'Meta webhook processed successfully'
    });
  } catch (error: any) {
    console.error('[Meta Webhook] Error processing inbound:', error);
    
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Error processing webhook',
      requestId 
    }, { status: 500 });
  }
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
      default:
        content = `[${messageType} message]`;
    }

    console.log(`[Meta Webhook] Processing ${messageType} message from ${sender}: ${content}`);

    // Process the inbound message - save to DB, trigger business logic, etc.
    await processInboundMessage({
      from: sender,
      to: value?.metadata?.display_phone_number,
      type: messageType,
      content: content,
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      messageId: message.id,
      requestId: requestId
    });
  }

  // Handle message statuses (sent, delivered, read, failed)
  if (value?.statuses) {
    for (const status of value.statuses) {
      await processMessageStatus(status, requestId);
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

/**
 * Processes message status updates (delivery, read, etc.)
 */
async function processMessageStatus(status: any, requestId: string) {
  try {
    const providerMessageId = status.id;
    const statusValue = status.status;
    
    // Map Meta status to our internal status
    let mappedStatus = 'OTHER';
    if (statusValue === 'sent') mappedStatus = 'SENT';
    else if (statusValue === 'delivered') mappedStatus = 'DELIVERED';
    else if (statusValue === 'read') mappedStatus = 'SEEN';
    else if (statusValue === 'failed') mappedStatus = 'FAILED';
    
    // Update the message status in the database
    await updateMessageStatusByProviderId(providerMessageId, mappedStatus);
    
    const messageId = await getMessageIdByProviderMessageId(providerMessageId);
    if (messageId) {
      await insertMessageEvent(messageId, 'status', {
        status: statusValue,
        mappedStatus,
        timestamp: status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
        recipientId: status.recipient_id,
        errors: status.errors
      });
    }
    
    console.log(`[Meta Webhook] Status updated for message ${providerMessageId} to ${mappedStatus}`);
  } catch (error) {
    console.error('[Meta Webhook] Error processing message status:', error);
  }
}

/**
 * Logs the webhook event for debugging
 */
async function logWebhookEvent(body: any, requestId: string) {
  try {
    await insertApiLog({
      requestId,
      endpoint: '/api/webhooks/meta',
      method: 'POST',
      requestHeadersMasked: { authorization: '***' },
      requestBodyMasked: body,
      responseStatus: 200,
      responseBody: { ok: true, requestId },
      latencyMs: Date.now() - Date.now(), // This will be 0 since we don't have the start time here
      ip: (global as any).requestIp || undefined,
    });
  } catch (error) {
    console.error('[Meta Webhook] Error logging webhook event:', error);
  }
}