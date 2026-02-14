import { NextResponse } from 'next/server';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';
import { OutgoingMessagePayloadSchema } from '@/lib/validation';
import { logMessage, logToFile } from '@/lib/logger';
import type { LogEntry, OutgoingMessagePayload } from '@/lib/types';
import getConfig from '@/config/providers';
import { insertApiLog, insertMessage, updateApiLog } from '@/server/repository';

/**
 * API Route for sending WhatsApp messages.
 * This is the single entry point for the Core Banking system.
 * It handles request validation, service orchestration, logging (DB + File), and response generation.
 * 
 * ROBUSTNESS UPDATE:
 * - All Database operations are wrapped in try-catch so they never block the critical path (sending).
 * - File logging is used as a primary/secondary consistent record.
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
      endpoint: '/api/whatsapp/send',
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

    const validation = OutgoingMessagePayloadSchema.safeParse(body);

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
      message: payload.body,
      status: result.success ? 'SENT' : 'FAILED',
      providerMessageId: result.providerMessageId,
      metadata: {
        provider: result.provider,
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
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    provider: payload.provider || appConfig.defaultProvider,
    to: payload.to,
    body: payload.body,
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
