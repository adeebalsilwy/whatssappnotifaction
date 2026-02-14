type Counter = { count: number; resetAt: number };
const buckets = new Map<string, Counter>();

export function checkRateLimit(clientId: string, limitPerMin = 60): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const key = clientId;
  let c = buckets.get(key);
  if (!c || now >= c.resetAt) {
    c = { count: 0, resetAt: now + 60_000 };
    buckets.set(key, c);
  }
  if (c.count >= limitPerMin) {
    return { ok: false, retryAfter: Math.max(0, Math.ceil((c.resetAt - now) / 1000)) };
  }
  c.count += 1;
  return { ok: true };
}

