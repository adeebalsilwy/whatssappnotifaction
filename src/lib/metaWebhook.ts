import crypto from 'crypto';
import { getSettings } from '@/server/settingsRepo';

export function computeXHubSignature(rawBody: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

export function verifyXHubSignature(headerValue: string | null | undefined, rawBody: string, secret: string): boolean {
  if (!headerValue || !secret) return false;
  const expected = computeXHubSignature(rawBody, secret);

  try {
    const a = Buffer.from(headerValue);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

export function getAllowedVerifyTokens(): string[] {
  const tokens: string[] = [];
  if (process.env.META_WEBHOOK_VERIFY_TOKEN) tokens.push(process.env.META_WEBHOOK_VERIFY_TOKEN);

  try {
    const settings = getSettings();
    const meta = (settings.providers as any)?.meta || {};
    // Support a top-level verify_token or an override map
    if (meta.verify_token) tokens.push(meta.verify_token);

    if (meta.override && typeof meta.override === 'object') {
      // WABA-level
      if (meta.override.waba && meta.override.waba.verify_token) tokens.push(meta.override.waba.verify_token);
      // Per phone numbers
      if (meta.override.phoneNumbers && typeof meta.override.phoneNumbers === 'object') {
        for (const k of Object.keys(meta.override.phoneNumbers)) {
          const v = meta.override.phoneNumbers[k];
          if (v?.verify_token) tokens.push(v.verify_token);
        }
      }
    }
  } catch (e) {
    // Ignore errors reading settings
  }

  return Array.from(new Set(tokens));
}
