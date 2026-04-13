import { NextResponse } from 'next/server';
import { WhatsAppNotificationService } from '@/services/WhatsAppNotificationService';
import { OutgoingMessagePayloadSchema } from '@/lib/validation';
import { logMessage, logToFile } from '@/lib/logger';
import type { LogEntry, OutgoingMessagePayload, Provider } from '@/lib/types';
import getConfig from '@/config/providers';
import { insertApiLog, insertMessage, updateApiLog } from '@/server/repository';

/**
 * API Route for sending WhatsApp messages.
 * This is the single entry point for Core Banking system.
 * It handles request validation, service orchestration, logging (DB + File), and response generation.
 * 
 * ROBUSTNESS UPDATE:
 * - All Database operations are wrapped in try-catch so they never block the critical path (sending).
 * - File logging is used as a primary/secondary consistent record.
 * - Enhanced to ensure logging/database errors don't interfere with message delivery.
 * 
 * Enhanced to support dashboard API calls with automatic template wrapping
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let payload: OutgoingMessagePayload | null = null;
  
  // Check if this is a dashboard API call
  const url = new URL(request.url);
  const isDashboardCall = url.pathname.includes('/dashboard/api/whatsapp/send');

  // =================================================================================
  // 1. Initial API Log (Async - Non-blocking)
  // =================================================================================
  try {
    await insertApiLog({
      requestId,
      endpoint: isDashboardCall ? '/dashboard/api/whatsapp/send' : '/api/whatsapp/send',
      method: 'POST',
      requestHeadersMasked: { userAgent: request.headers.get('user-agent') },
      requestBodyMasked: null,
    });
  } catch (e) {
    // If DB fails, log to file - but don't stop message processing
    try {
      await logToFile('api', { requestId, action: 'REQUEST_RECEIVED', error: (e as Error).message });
    } catch (logError) {
      console.error('[API Route] Failed to log initial API call:', logError);
    }
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
      try {
        await logToFile('api', { requestId, action: 'UPDATE_BODY', error: (e as Error).message });
      } catch (logError) {
        console.error('[API Route] Failed to log request body:', logError);
      }
    }

    let processedBody = body;
    
    // If this is a dashboard call, automatically wrap in template
    if (isDashboardCall) {
      processedBody = {
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
    } else {
      // For regular API calls (including public API), also support automatic template wrapping
      // This enables simultaneous WhatsApp + SMS delivery for all API calls
      processedBody = {
        ...body,
        // Map 'message' to 'body' if present
        body: body.message || body.body,
        // Set default message type to TEXT, but enable simultaneous delivery
        messageType: body.messageType || 'TEXT',
        // If message type is TEXT, we'll convert to template for Meta reliability
        // but the system will still send via both channels
        templateId: body.templateId,
        variables: body.variables,
        // Add metadata for tracking
        meta: {
          sourceSystem: 'PublicAPI',
          txnId: `pub-${Date.now()}`,
          eventType: body.eventType || 'OTHER',
          ...body.meta
        }
      };
    }

    const validation = OutgoingMessagePayloadSchema.safeParse(processedBody);

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
        try {
          await logToFile('api', { requestId, action: 'RESPONSE_400', body: errorResponse });
        } catch (logError) {
          console.error('[API Route] Failed to log validation error:', logError);
        }
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
      try {
        await logToFile('api', { requestId, action: 'RESPONSE_400', body: responseError });
      } catch (logError) {
        console.error('[API Route] Failed to log JSON error:', logError);
      }
    }

    return NextResponse.json(responseError, { status: 400 });
  }

  // =================================================================================
  // 3. Service Execution (Critical Path - Must Run)
  // =================================================================================
  const service = new WhatsAppNotificationService();
  let result;
  try {
    result = await service.send(payload);
  } catch (serviceError) {
    // If the service fails completely, return a generic error
    console.error('[API Route] Service execution failed:', serviceError);
    
    // Log the service error (non-blocking)
    try {
      await logToFile('errors', {
        requestId,
        action: 'SERVICE_EXECUTION_ERROR',
        error: serviceError instanceof Error ? serviceError.message : 'Unknown service error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
    } catch (logError) {
      console.error('[API Route] Failed to log service error:', logError);
    }
    
    result = {
      success: false,
      provider: 'meta' as Provider, // Use a valid provider type
      rawResponse: { error: 'Service execution failed' },
      errorCode: 'SERVICE_ERROR',
      errorMessage: 'Message service execution failed'
    };
  }

  // =================================================================================
  // 4. Message Logging (DB + File) - CRITICAL: Must not block message delivery
  // =================================================================================

  // A. Database Insert (Non-blocking - errors should not affect response)
  try {
    await insertMessage({
      to: payload.to,
      message: payload.body || `Template: ${payload.templateId}`,
      status: result.success ? 'SENT' : 'FAILED',
      providerMessageId: result.providerMessageId,
      metadata: {
        provider: result.provider,
        messageType: payload.messageType,
        templateId: payload.templateId,
        isDashboardCall: isDashboardCall,
        ...payload.meta,
        error: result.errorMessage
      }
    });
  } catch (dbError) {
    console.error('[API Route] Failed to insert message into DB:', dbError);
    // Don't return here - continue with response since the message was sent
    
    // Log the DB insertion failure (non-blocking)
    try {
      await logToFile('errors', {
        requestId,
        action: 'DB_INSERT_MESSAGE_FAILED',
        error: (dbError as Error).message,
        payload
      });
    } catch (logError) {
      console.error('[API Route] Failed to log DB insertion error:', logError);
    }
  }

  // B. File Logging (Standard/Legacy - Guaranteed but non-blocking)
  try {
    const appConfig = getConfig();
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      provider: payload.provider || appConfig.defaultProvider,
      to: payload.to,
      body: payload.body || '',
      meta: payload.meta,
      providerResult: result,
      request: payload,
      response: result,
    };

    // Use new robust file logger categorized as 'messages'
    await logToFile('messages', logEntry);
  } catch (logError) {
    console.error('[API Route] Failed to write to file log:', logError);
    // Still continue - logging error shouldn't affect message delivery
  }

  // =================================================================================
  // 5. Final API Log (Safely wrapped - non-blocking)
  // =================================================================================
  try {
    await updateApiLog(requestId, {
      responseStatus: result.success ? 200 : 500,
      responseBody: result,
      latencyMs: Date.now() - startTime
    });
  } catch (e) {
    try {
      await logToFile('api', {
        requestId,
        action: 'RESPONSE_FINAL',
        status: result.success ? 200 : 500,
        latency: Date.now() - startTime
      });
    } catch (logError) {
      console.error('[API Route] Failed to log final response:', logError);
    }
  }

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}