import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../src/server/rateLimit';

test('rate limit allows under threshold', () => {
  const id = 'client-1';
  for (let i = 0; i < 60; i++) {
    const res = checkRateLimit(id, 60);
    assert.equal(res.ok, true);
  }
});

test('rate limit blocks after threshold', () => {
  const id = 'client-2';
  for (let i = 0; i < 60; i++) checkRateLimit(id, 60);
  const res = checkRateLimit(id, 60);
  assert.equal(res.ok, false);
});

