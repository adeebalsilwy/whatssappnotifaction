import { NextResponse } from 'next/server';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';
import { OutgoingMessagePayloadSchema } from '@/lib/validation';
import { logMessage, logToFile } from '@/lib/logger';
import type { OutgoingMessagePayload } from '@/lib/types';
import getConfig from '@/config/providers';
import { insertApiLog, insertMessage, updateApiLog } from '@/server/repository';

/**
 * Public API Route for sending WhatsApp messages from dashboard.
 * This endpoint accepts POST requests without authentication and automatically
 * wraps messages in templates for WhatsApp compliance.
 * 
 * Endpoint: POST /api/dashboard/whatsapp/send
 * Body: { "message": "your message", "to": "+967774577134" }
 * 
 * Features:
 * - No authentication required (public endpoint)
 * - Automatic template wrapping for compliance
 * - Supports both Arabic and English messages
 * - Fallback mechanisms for reliable delivery
 * - Comprehensive logging
 */

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let payload: OutgoingMessagePayload | null = null;

  // =================================================================================
  // 1. Initial API Log (Async - Non-blocking)
  // =================================================================================
  try {
    await insertApiLog({
      requestId,
      endpoint: '/api/dashboard/whatsapp/send',
      method: 'POST',
      requestHeadersMasked: { userAgent: request.headers.get('user-agent') },
      requestBodyMasked: null,
    });
  } catch (e) {
    // If DB fails, log to file
    await logToFile('api', { requestId, action: 'REQUEST_RECEIVED', error: (e as Error).message });
  }

  // =================================================================================
  // 2. Request Parsing & Validation
  // =================================================================================
  try {
    const body = await request.json();

    // Attempt DB Log update (Non-blocking)
    try {
      await updateApiLog(requestId, { requestBodyMasked: body });
    } catch (e) {
      await logToFile('api', { requestId, action: 'UPDATE_BODY', error: (e as Error).message });
    }

    // Transform the request body to match our expected format
    const transformedBody = {
      ...body,
      // Map 'message' to 'body' if present
      body: body.message || body.body,
      // Set default message type to TEMPLATE for compliance
      messageType: 'TEMPLATE',
      // Use a general notification template
      templateId: 'arabic_general_notification',
      // Wrap the message content in variables
      variables: {
        '1': body.message || body.body || 'رسالة من بنك عدن الأول الإسلامي'
      },
      // Add metadata for tracking
      meta: {
        sourceSystem: 'DashboardPublicAPI',
        txnId: `dash-${Date.now()}`,
        eventType: 'OTHER',
        ...body.meta
      }
    };

    const validation = OutgoingMessagePayloadSchema.safeParse(transformedBody);

    if (!validation.success) {
      const errorResponse = {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        errors: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };

      // Attempt DB Log finalization (Non-blocking)
      try {
        await updateApiLog(requestId, {
          responseStatus: 400,
          responseBody: errorResponse,
          latencyMs: Date.now() - startTime
        });
      } catch (e) {
        await logToFile('api', { requestId, action: 'RESPONSE_400', body: errorResponse });
      }

      return NextResponse.json(errorResponse, { status: 400 });
    }
    payload = validation.data;
  } catch (error) {
    const responseError = {
      success: false,
      errorCode: 'INVALID_JSON',
      errors: ['Request body is not valid JSON.'],
    };

    // Attempt DB Log finalization (Non-blocking)
    try {
      await updateApiLog(requestId, {
        responseStatus: 400,
        responseBody: responseError,
        latencyMs: Date.now() - startTime
      });
    } catch (e) {
      await logToFile('api', { requestId, action: 'RESPONSE_400', body: responseError });
    }

    return NextResponse.json(responseError, { status: 400 });
  }

  // =================================================================================
  // 3. Service Execution (Critical Path - Must Run)
  // =================================================================================
  const service = new WhatsAppNotificationService();
  const result = await service.send(payload);

  // =================================================================================
  // 4. Message Logging (DB + File)
  // =================================================================================

  // A. Database Insert (Safely wrapped)
  try {
    await insertMessage({
      to: payload.to,
      message: payload.body || `Template: ${payload.templateId}`,
      status: result.success ? 'SENT' : 'FAILED',
      providerMessageId: result.providerMessageId,
      metadata: {
        provider: result.provider,
        messageType: 'TEMPLATE',
        templateId: payload.templateId,
        ...payload.meta,
        error: result.errorMessage
      }
    });
  } catch (dbError) {
    console.error('Failed to insert message into DB:', dbError);
    // Explicitly log this failure to 'errors' file
    await logToFile('errors', {
      requestId,
      action: 'DB_INSERT_MESSAGE_FAILED',
      error: (dbError as Error).message,
      payload
    });
  }

  // B. File Logging (Standard/Legacy - Guaranteed)
  const appConfig = getConfig();
  const logEntry = {
    timestamp: new Date().toISOString(),
    provider: payload.provider || appConfig.defaultProvider,
    to: payload.to,
    body: payload.body,
    messageType: payload.messageType,
    templateId: payload.templateId,
    variables: payload.variables,
    meta: payload.meta,
    providerResult: result,
    request: payload,
    response: result,
  };

  // Use new robust file logger categorized as 'messages'
  await logToFile('messages', logEntry);

  // =================================================================================
  // 5. Final API Log (Safely wrapped)
  // =================================================================================
  try {
    await updateApiLog(requestId, {
      responseStatus: result.success ? 200 : 500,
      responseBody: result,
      latencyMs: Date.now() - startTime
    });
  } catch (e) {
    console.error('Failed to update final API log:', e);
    await logToFile('api', {
      requestId,
      action: 'RESPONSE_FINAL',
      status: result.success ? 200 : 500,
      latency: Date.now() - startTime
    });
  }

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method Not Allowed. Use POST method to send WhatsApp messages.' 
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method Not Allowed. Use POST method to send WhatsApp messages.' 
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method Not Allowed. Use POST method to send WhatsApp messages.' 
  }, { status: 405 });
}