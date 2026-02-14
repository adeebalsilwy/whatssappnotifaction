import { executeQuery } from './db';

export type MessageInsert = {
  referenceId?: string;
  sender?: string;
  to: string;
  message: string;
  status: string;
  providerMessageId?: string;
  priority?: string;
  metadata?: any;
};

export async function insertMessage(msg: MessageInsert) {
  // Use SQLite syntax
  const res = await executeQuery(
    `INSERT INTO messages (referenceId, sender, [to], message, status, providerMessageId, priority, metadata)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      msg.referenceId || null,
      msg.sender || null,
      msg.to,
      msg.message,
      msg.status,
      msg.providerMessageId || null,
      msg.priority || null,
      JSON.stringify(msg.metadata || null),
    ]
  );
  return (res.rows?.[0] as {id: number})?.id ?? 0;
}

export async function insertMessageEvent(messageId: number, eventType: string, eventPayload: any) {
  await executeQuery(
    `INSERT INTO message_events (messageId, eventType, eventPayload) VALUES (?,?,?)`,
    [messageId, eventType, JSON.stringify(eventPayload)]
  );
}

export async function updateMessageStatusByProviderId(providerMessageId: string, status: string) {
  await executeQuery(
    `UPDATE messages SET status=? WHERE providerMessageId=?`,
    [status, providerMessageId]
  );
}

export async function getMessageIdByProviderMessageId(providerMessageId: string): Promise<number | null> {
  const res = await executeQuery(`SELECT id FROM messages WHERE providerMessageId=? LIMIT 1`, [providerMessageId]);
  return (res.rows?.[0] as {id: number})?.id ?? null;
}

export type ApiLogInsert = {
  requestId: string;
  endpoint: string;
  method: string;
  requestHeadersMasked: any;
  requestBodyMasked: any;
  responseStatus?: number;
  responseBody?: any;
  latencyMs?: number;
  ip?: string;
};

export async function insertApiLog(log: ApiLogInsert) {
  await executeQuery(
    `INSERT INTO api_logs (requestId, endpoint, method, requestHeadersMasked, requestBodyMasked, responseStatus, responseBody, latencyMs, ip)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      log.requestId,
      log.endpoint,
      log.method,
      JSON.stringify(log.requestHeadersMasked || null),
      JSON.stringify(log.requestBodyMasked || null),
      log.responseStatus || null,
      JSON.stringify(log.responseBody || null),
      log.latencyMs || null,
      log.ip || null,
    ]
  );
}

export async function updateApiLog(requestId: string, patch: Partial<ApiLogInsert>) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${camelToColumn(k)}=?`);
    values.push(typeof v === 'object' ? JSON.stringify(v) : v);
  }
  values.push(requestId);
  if (fields.length === 0) return;
  await executeQuery(`UPDATE api_logs SET ${fields.join(', ')} WHERE requestId=?`, values);
}

function camelToColumn(key: string): string {
  switch (key) {
    case 'endpoint': return 'endpoint';
    case 'method': return 'method';
    case 'requestHeadersMasked': return 'requestHeadersMasked';
    case 'requestBodyMasked': return 'requestBodyMasked';
    case 'responseStatus': return 'responseStatus';
    case 'responseBody': return 'responseBody';
    case 'latencyMs': return 'latencyMs';
    case 'ip': return 'ip';
    default: return key;
  }
}