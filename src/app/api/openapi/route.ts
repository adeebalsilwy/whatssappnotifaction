import { NextResponse } from 'next/server';
import swagger from '@/openapi/whatsapp.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(swagger, { status: 200 });
}

