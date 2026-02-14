# Meta Webhook Security & Overrides 🔒

This doc explains how the project verifies Meta (WhatsApp) webhook payloads, how to configure override callbacks, and how to test the implementation locally.

## Signature verification (X-Hub-Signature-256) ✅

Meta signs webhook payloads with HMAC-SHA256 using your App Secret and adds the signature to the `X-Hub-Signature-256` header (format: `sha256=<hex>`).

### How it works in this project
- Add your app secret to `.env.local` as `META_APP_SECRET`.
- All Meta POST webhook endpoints (`/api/webhooks/meta`, `/api/webhooks/meta/inbound`, `/api/webhooks/meta/status`) now verify the signature prior to processing. If the signature does not match, the endpoint returns 403.
- The verification uses a constant-time comparison to avoid timing attacks.

### Test signature locally (example)
- Compute signature with `openssl` or node. Example using node: 

  node -e "const crypto=require('crypto'); const payload=JSON.stringify({hello:'world'}); const s='YOUR_APP_SECRET'; console.log('sha256='+crypto.createHmac('sha256',s).update(payload,'utf8').digest('hex'))"

- Send test request with curl (replace `<SIG>` and URL):

  curl -X POST "https://your-tunnel-url/api/webhooks/meta/inbound" \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: <SIG>" \
    -d '{"entry":[]}'

If the signature matches and the payload is valid, you will receive `ok: true`.

## Webhook verification (GET / hub.challenge) and overrides 🔁

When Meta verifies your webhook (on subscription or override) it sends a GET request with `?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`.

- The GET handler accepts verify tokens from multiple sources:
  - The environment variable `META_WEBHOOK_VERIFY_TOKEN` (default flow)
  - Per-WABA or per-phone override verify tokens stored in the `settings` DB (see below)

### Storing override verify tokens and callback URIs
- Override data is stored in the `providers.meta.config` object saved via the app settings (`/api/settings` or the dashboard). Schema example:

  {
    providers: {
      meta: {
        override: {
          waba: { verify_token: "my-waba-token", callback_uri: "https://..." },
          phoneNumbers: {
            "123456789": { verify_token: "phone-token", callback_uri: "https://..." }
          }
        }
      }
    }
  }

- The GET verification handler will accept `hub.verify_token` if it matches any of the allowed tokens.

## Automating override setup (dev-tools) ⚙️

A helper script is included: `dev-tools/override-meta-webhook.js`

Usage examples:

- Override WABA callback:
  META_WHATSAPP_TOKEN="<token>" node dev-tools/override-meta-webhook.js --waba <WABA_ID> --callback https://example.com/api/webhooks/meta/inbound --verify-token my-token

- Override phone number callback:
  META_WHATSAPP_TOKEN="<token>" node dev-tools/override-meta-webhook.js --phone <PHONE_NUMBER_ID> --callback https://example.com/api/webhooks/meta/inbound --verify-token my-token

This script uses the Graph API and requires `META_WHATSAPP_TOKEN` (or `WHATSAPP_ACCESS_TOKEN`) present in environment.

## mTLS (optional)

If Meta requires mutual TLS for your integration, configure your reverse proxy (Nginx, ALB) to require client certificates and forward requests to this app. The app itself does not handle mTLS termination.

## Next steps / Recommendations ✅

- Add `META_APP_SECRET` to `.env.local` in production and in your CI so the verification runs reliably.
- Use `META_WEBHOOK_VERIFY_TOKEN` as a stable fallback when not using overrides.
- Optionally store per-phone or per-WABA override verify tokens in the settings UI.
- Run tests: `npm test` (this includes signature verification unit tests).
