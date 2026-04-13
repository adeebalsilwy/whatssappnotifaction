import { NextRequest } from 'next/server';
import { A2AMessageService } from '@/services/A2AMessageService';
import { loadA2AConfig } from '@/lib/a2a-config';

const a2aService = new A2AMessageService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get filters from query parameters
    const status = searchParams.get('status') || undefined;
    const mobileNo = searchParams.get('mobileNo') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filter = { status, mobileNo, dateFrom, dateTo };
    const result = await a2aService.getA2AMessages(filter, limit, offset);

    return Response.json(result);
  } catch (error: any) {
    console.error('Error fetching A2A messages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for mode in request body
    let mode: 'live' | 'test' = 'live';
    try {
      const body = await request.json();
      if (body.mode) {
        mode = body.mode === 'test' ? 'test' : 'live';
      }
    } catch (parseError) {
      // If parsing fails, use default mode
      console.warn('Could not parse request body, using default mode');
    }
    
    const a2aConfig = loadA2AConfig(mode);

    if (!a2aConfig) {
      return Response.json({ error: 'A2A provider configuration not found' }, { status: 400 });
    }

    // Trigger immediate fetch of A2A notifications
    const notifications = await a2aService.fetchA2ANotifications(undefined, mode);
    await a2aService.storeA2AMessages(notifications);

    return Response.json({ 
      success: true, 
      message: `A2A notifications fetched and stored successfully (mode: ${mode})`,
      count: notifications.length,
      mode: mode
    });
  } catch (error: any) {
    console.error('Error processing A2A request:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Parse request body safely
    let intervalMs = 30000; // default value
    let mode: 'live' | 'test' = 'live'; // default mode
    
    try {
      const body = await request.json();
      intervalMs = body.intervalMs || 30000;
      if (body.mode) {
        mode = body.mode === 'test' ? 'test' : 'live';
      }
    } catch (parseError) {
      // If parsing fails, use default values
      console.warn('Could not parse request body, using default values');
    }
    
    const a2aConfig = loadA2AConfig(mode);

    if (!a2aConfig) {
      return Response.json({ error: 'A2A provider configuration not found' }, { status: 400 });
    }

    // Start polling A2A notifications
    a2aService.startPolling(undefined, intervalMs, mode);

    return Response.json({ 
      success: true, 
      message: `A2A polling started with interval ${intervalMs}ms (mode: ${mode})`,
      mode: mode
    });
  } catch (error: any) {
    console.error('Error starting A2A polling:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Stop polling A2A notifications
    a2aService.stopPolling();

    return Response.json({ 
      success: true, 
      message: 'A2A polling stopped'
    });
  } catch (error: any) {
    console.error('Error stopping A2A polling:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}