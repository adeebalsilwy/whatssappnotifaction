import { NextResponse } from 'next/server';
import { getLogsByDate } from '@/lib/logger';
import { LogCategory } from '@/lib/logger';

// GET - Fetch logs for specific date and category
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '0');
    const month = parseInt(searchParams.get('month') || '0');
    const day = parseInt(searchParams.get('day') || '0');
    const category = (searchParams.get('category') || 'messages') as LogCategory;
    const limit = parseInt(searchParams.get('limit') || '100');
    
    if (!year || !month || !day) {
      return NextResponse.json(
        { success: false, error: 'Year, month, and day are required' },
        { status: 400 }
      );
    }
    
    const logs = await getLogsByDate(year, month, day, category, limit);
    
    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        year,
        month,
        day,
        category,
        count: logs.length
      }
    });
  } catch (error) {
    console.error('Error fetching logs by date:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}