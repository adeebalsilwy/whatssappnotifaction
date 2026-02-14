import { promises as fs } from 'fs';
import path from 'path';

type Json = any;

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

function datePath(base: string, d = new Date()): string {
  const y = d.getFullYear().toString();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return path.join(process.cwd(), 'data', base, y, m, day);
}

export async function saveInbound(record: Json, requestId: string, when = new Date()): Promise<string> {
  const dir = datePath('inbound', when);
  await ensureDir(dir);
  const file = path.join(dir, `${requestId}.json`);
  await fs.writeFile(file, JSON.stringify(record));
  return file;
}

export async function saveMessage(record: Json, requestId: string, when = new Date()): Promise<string> {
  const dir = datePath('messages', when);
  await ensureDir(dir);
  const file = path.join(dir, `${requestId}.json`);
  await fs.writeFile(file, JSON.stringify(record));
  return file;
}

export async function saveWebhook(record: Json, requestId: string, when = new Date()): Promise<string> {
  const dir = datePath('webhooks', when);
  await ensureDir(dir);
  const file = path.join(dir, `${requestId}.json`);
  await fs.writeFile(file, JSON.stringify(record));
  return file;
}
