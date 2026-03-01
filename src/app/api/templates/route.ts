import { NextResponse } from 'next/server';
import { getAllTemplates } from '@/server/templateRepo';

export async function GET() {
  try {
    const templates = getAllTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
