import test from 'node:test';
import assert from 'node:assert/strict';
import { TemenosInboundSchema, extractUserId, mapTemenosToPayload } from '../src/server/temenos';

test('TemenosInboundSchema validates correct payload', () => {
  const parsed = TemenosInboundSchema.safeParse({ message: 'Hi', mobileNo: '+966512345678' });
  assert.equal(parsed.success, true);
});

test('extractUserId prefers body, then header, then query', async () => {
  const url = 'http://localhost/any?UserId=query-1';
  const req = new Request(url, { headers: { 'X-UserId': 'header-1' } });
  assert.equal(extractUserId(req), 'header-1');
  assert.equal(extractUserId(req, 'body-1'), 'body-1');
});

test('mapTemenosToPayload builds OutgoingMessagePayload', () => {
  const payload = mapTemenosToPayload({ message: 'Hello', mobileNo: '+1234567890' }, 'u123');
  assert.equal(payload.messageType, 'TEXT');
  assert.equal(payload.to, '+1234567890');
  assert.equal(payload.body, 'Hello');
  assert.equal(payload.from, 'u123');
  assert.ok(payload.meta.txnId);
});

