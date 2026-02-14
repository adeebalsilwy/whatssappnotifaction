import { NextResponse } from 'next/server';
import { saveWebhook } from '@/lib/jsondb';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let body: any = null;
  try {
    body = await request.json();
  } catch {}
  await saveWebhook({ requestId, body }, requestId);
  return NextResponse.json({ ok: true, requestId });
}

