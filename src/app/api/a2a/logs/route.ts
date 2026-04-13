import { NextRequest } from 'next/server';
import { getFilteredA2ALogs, readA2ALogs, getAvailableA2ALogDates } from '@/lib/a2a-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get filters from query parameters
    const status = searchParams.get('status') || undefined;
    const action = searchParams.get('action') || undefined;
    const mode = searchParams.get('mode') || undefined;
    const startDateStr = searchParams.get('startDate') || undefined;
    const endDateStr = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Parse date parameters if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (startDateStr) {
      startDate = new Date(startDateStr);
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
    }

    const filters = {
      startDate,
      endDate,
      status,
      action,
      mode
    };

    // Get filtered logs
    const allLogs = await getFilteredA2ALogs(filters);
    
    // Apply pagination
    const paginatedLogs = allLogs.slice(offset, offset + limit);

    return Response.json({ 
      data: paginatedLogs, 
      total: allLogs.length,
      offset,
      limit
    });
  } catch (error: any) {
    console.error('Error fetching A2A logs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get specific date logs if date is provided
    if (body.date) {
      const date = new Date(body.date);
      const logs = await readA2ALogs(date);
      return Response.json({ data: logs });
    }
    
    return Response.json({ error: 'Date parameter required for fetching specific date logs' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching A2A logs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}