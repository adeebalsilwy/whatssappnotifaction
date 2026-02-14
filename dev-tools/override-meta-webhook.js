#!/usr/bin/env node
// Simple helper to call Meta Graph API to set override_callback_uri for WABA or phone number
// Usage examples:
//   node dev-tools/override-meta-webhook.js --waba <WABA_ID> --callback https://example.com/webhooks/meta --verify-token mytoken
//   node dev-tools/override-meta-webhook.js --phone <PHONE_NUMBER_ID> --callback https://example.com/webhooks/meta --verify-token mytoken

const axios = require('axios');

const rawArgs = process.argv.slice(2);
const argv = {};
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a.startsWith('--')) {
    const key = a.replace(/^--/, '');
    const next = rawArgs[i+1];
    if (next && !next.startsWith('--')) {
      argv[key] = next;
      i++;
    } else {
      argv[key] = true;
    }
  }
}

const token = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
if (!token) {
  console.error('Missing META_WHATSAPP_TOKEN or WHATSAPP_ACCESS_TOKEN in environment.');
  process.exit(1);
}

const callback = argv.callback || argv.c;
const verifyToken = argv['verify-token'] || argv.v || process.env.META_WEBHOOK_VERIFY_TOKEN;
if (!callback || !verifyToken) {
  console.error('Missing --callback and/or --verify-token (or set META_WEBHOOK_VERIFY_TOKEN in env)');
  process.exit(1);
}

async function overrideWaba(wabaId) {
  const url = `https://graph.facebook.com/v24.0/${wabaId}/subscribed_apps`;
  try {
    const res = await axios.post(url, {
      override_callback_uri: callback,
      verify_token: verifyToken
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('WABA override response:', res.data);
  } catch (e) {
    console.error('Error overriding WABA callback:', e.response ? e.response.data : e.message);
  }
}

async function overridePhone(phoneId) {
  const url = `https://graph.facebook.com/v24.0/${phoneId}`;
  try {
    // The phone number webhook_configuration is set via a POST with webhook_configuration param
    const res = await axios.post(url, {
      webhook_configuration: { override_callback_uri: callback, verify_token: verifyToken }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Phone override response:', res.data);
  } catch (e) {
    console.error('Error overriding Phone callback:', e.response ? e.response.data : e.message);
  }
}

(async () => {
  if (argv.waba) {
    await overrideWaba(argv.waba);
  }

  if (argv.phone) {
    await overridePhone(argv.phone);
  }

  if (!argv.waba && !argv.phone) {
    console.error('Specify --waba <WABA_ID> or --phone <PHONE_NUMBER_ID>');
  }
})();
