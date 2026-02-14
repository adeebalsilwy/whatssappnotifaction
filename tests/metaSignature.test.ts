import test from 'node:test';
import assert from 'node:assert/strict';
import { computeXHubSignature, verifyXHubSignature } from '../src/lib/metaWebhook';

test('computes signature correctly', () => {
  const secret = 'my-secret-key';
  const payload = JSON.stringify({ hello: 'world' });
  const sig = computeXHubSignature(payload, secret);
  // Should start with sha256=
  assert.ok(sig.startsWith('sha256='));
});

test('verifies valid signature', () => {
  const secret = 'another-secret';
  const payload = JSON.stringify({ a: 1, b: 'x' });
  const header = computeXHubSignature(payload, secret);
  const ok = verifyXHubSignature(header, payload, secret);
  assert.equal(ok, true);
});

test('rejects invalid signature', () => {
  const secret = 's1';
  const payload = JSON.stringify({ x: 1 });
  const header = computeXHubSignature(payload, 'different');
  const ok = verifyXHubSignature(header, payload, secret);
  assert.equal(ok, false);
});