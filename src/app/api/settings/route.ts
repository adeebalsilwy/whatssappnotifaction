import { NextResponse } from 'next/server';
import { ProviderSettingsSchema } from '@/lib/validation';
import type { AppConfig } from '@/lib/types';
import { getSettings as getSettingsFromSqlite, upsertSettings as upsertSettingsToSqlite } from '@/server/settingsRepo';

export async function GET() {
  const settings = getSettingsFromSqlite();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = ProviderSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.errors }, { status: 400 });
  }
  const payload = parsed.data as AppConfig;
  upsertSettingsToSqlite(payload);
  const settings = getSettingsFromSqlite();
  return NextResponse.json(settings, { status: 200 });
}

