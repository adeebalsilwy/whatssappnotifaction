import jwt from 'jsonwebtoken';

export type AuthResult = { ok: true; clientId: string } | { ok: false; error: string };

export function authenticate(authHeader?: string): AuthResult {
  if (!authHeader) return { ok: false, error: 'Missing Authorization header' };
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return { ok: false, error: 'Invalid Authorization header' };

  const apiKeys = (process.env.API_KEYS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (apiKeys.includes(token)) {
    return { ok: true, clientId: `key:${maskToken(token)}` };
  }

  const secret = process.env.JWT_SECRET;
  if (secret) {
    try {
      const decoded = jwt.verify(token, secret) as any;
      const clientId = decoded.sub || decoded.client_id || 'jwt';
      return { ok: true, clientId: String(clientId) };
    } catch {
      return { ok: false, error: 'Invalid token' };
    }
  }

  return { ok: false, error: 'Unauthorized' };
}

export function maskToken(token: string): string {
  if (token.length <= 6) return '***';
  return `${token.slice(0,3)}***${token.slice(-3)}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/[^+\d]/g, '');
  if (cleaned.length <= 6) return '***';
  return `${cleaned.slice(0,4)}***${cleaned.slice(-3)}`;
}

export function maskText(text: string): string {
  if (text.length <= 8) return '***';
  return `${text.slice(0,4)}***${text.slice(-4)}`;
}

