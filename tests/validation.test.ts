import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageRequestSchema, normalizeRecipients } from '../src/server/schemas';

test('rejects invalid phone', () => {
  const res = MessageRequestSchema.safeParse({ to: '123', message: 'hi', sender: 'BANK', referenceId: 'REF' });
  assert.equal(res.success, false);
});

test('rejects empty message', () => {
  const res = MessageRequestSchema.safeParse({ to: '+967774577134', message: '', sender: 'BANK', referenceId: 'REF' });
  assert.equal(res.success, false);
});

test('accepts multiple recipients', () => {
  const res = MessageRequestSchema.safeParse({ to: ['+967774577134','+967774577135'], message: 'hi', sender: 'BANK', referenceId: 'REF' });
  assert.equal(res.success, true);
  const recipients = normalizeRecipients(res.success ? res.data : ({} as any));
  assert.equal(recipients.length, 2);
});

