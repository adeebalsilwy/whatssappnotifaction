import { NextResponse } from 'next/server';
import { getLogDates } from '@/lib/logger';

// GET - Fetch available log dates for navigation
export async function GET() {
  try {
    const logDates = await getLogDates();
    
    return NextResponse.json({
      success: true,
      data: logDates
    });
  } catch (error) {
    console.error('Error fetching log dates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch log dates' },
      { status: 500 }
    );
  }
}