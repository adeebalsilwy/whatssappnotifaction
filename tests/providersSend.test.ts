// Ensure test environment is explicit for providers that branch on NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import test from 'node:test';
import assert from 'node:assert/strict';
import { MetaWhatsAppProvider } from '../src/providers/MetaWhatsAppProvider';
import { VonageWhatsAppProvider } from '../src/providers/VonageWhatsAppProvider';
import { GenericWhatsAppProvider } from '../src/providers/GenericWhatsAppProvider';
import { DirectWhatsAppProvider } from '../src/providers/DirectWhatsAppProvider';
import type { AppConfig, OutgoingMessagePayload } from '../src/lib/types';

const payload: OutgoingMessagePayload = {
  provider: 'meta',
  messageType: 'TEXT',
  to: '+12345678901',
  from: 'BANK',
  body: 'Test message',
  meta: {
    sourceSystem: 'TEST',
    companyId: 'KSA',
    txnId: 'TEST-1',
    accountNo: 'ACC',
    eventType: 'OTHER',
    timestamp: new Date().toISOString(),
  },
};

const appConfig: AppConfig = {
  defaultProvider: 'meta',
  providers: {
    meta: { url: 'https://graph.facebook.com/v20.0', token: 't', numberId: '1' },
    vonage: { url: 'https://messages-sandbox.nexmo.com/v1/messages', apiKey: 'k', apiSecret: 's', from: '14157386102' },
    generic: { url: 'http://localhost/mock', token: 'g' },
    direct: { url: 'http://localhost/direct', token: 'd', from: '+12345678901' },
  },
};

function mockFetch(ok: boolean, body: any) {
  // @ts-ignore
  global.fetch = async () => ({ ok, json: async () => body });
}

test('Meta provider send success mapping', async () => {
  mockFetch(true, { messages: [{ id: 'ABC' }] });
  const res = await new MetaWhatsAppProvider().sendTextMessage(payload, appConfig);
  assert.equal(res.success, true);
  assert.equal(res.providerMessageId, 'ABC');
});

test('Vonage provider send success mapping', async () => {
  mockFetch(true, { message_uuid: 'UUID' });
  const res = await new VonageWhatsAppProvider().sendTextMessage(payload, appConfig);
  assert.equal(res.success, true);
  assert.equal(res.providerMessageId, 'UUID');
});

test('Generic provider send success mapping', async () => {
  mockFetch(true, { ok: true, id: 'GEN-1' });
  const res = await new GenericWhatsAppProvider().sendTextMessage(payload, appConfig);
  assert.equal(res.success, true);
  assert.equal(res.providerMessageId, 'GEN-1');
});

test('Direct provider send success mapping', async () => {
  mockFetch(true, { id: 'DIR-1' });
  const res = await new DirectWhatsAppProvider().sendTextMessage(payload, appConfig);
  assert.equal(res.success, true);
  assert.equal(res.providerMessageId, 'DIR-1');
});

// --- TEMPLATE message tests ---

test('Meta provider sends TEMPLATE payload when requested', async () => {
  // Ensure Meta provider returns a message id for template sends
  mockFetch(true, { messages: [{ id: 'TEMPLATE-META-1' }] });

  const tplPayload = { ...payload, messageType: 'TEMPLATE', templateId: 'deposit_notification', variables: { amount: '100' }, body: 'Preview' } as any;
  const res = await new MetaWhatsAppProvider().sendTextMessage(tplPayload, appConfig);
  assert.equal(res.success, true);
  assert.equal(res.providerMessageId, 'TEMPLATE-META-1');
});

test('Vonage provider sends TEMPLATE via SDK when requested', async () => {
  // Vonage SDK template response uses message_uuid
  mockFetch(true, { message_uuid: 'VONAGE-TPL-1' });

  const tplPayload = { ...payload, messageType: 'TEMPLATE', templateId: 'deposit_notification', variables: { amount: '200' }, body: 'Preview' } as any;
  const res = await new VonageWhatsAppProvider().sendTextMessage(tplPayload, appConfig);
  assert.equal(res.success, true);
  assert.equal(res.providerMessageId, 'VONAGE-TPL-1');
});
