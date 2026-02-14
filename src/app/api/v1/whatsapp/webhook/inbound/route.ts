import { NextResponse } from 'next/server';
import { saveInbound } from '@/lib/jsondb';
import { insertApiLog } from '@/server/repository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const ip = (request as any).ip || undefined;
  let body: any = null;
  try {
    body = await request.json();
  } catch {}
  await saveInbound({ requestId, body }, requestId);
  await insertApiLog({
    requestId,
    endpoint: '/v1/whatsapp/webhook/inbound',
    method: 'POST',
    requestHeadersMasked: { authorization: '***' },
    requestBodyMasked: body,
    responseStatus: 200,
    responseBody: { ok: true, requestId },
    latencyMs: Date.now() - started,
    ip,
  });
  return NextResponse.json({ ok: true, requestId });
}

