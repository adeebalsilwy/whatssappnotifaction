# Multi-Provider WhatsApp Gateway

This Next.js project serves as an intermediate gateway for sending WhatsApp notifications from a Core Banking system (like Temenos T24) to various WhatsApp providers. It's designed to be modular, scalable, and easy to maintain.

## 📁 Project Structure

For detailed information about the project organization, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

**Quick Overview:**
- `src/` - Main application source code
- `data/` - Persistent data files (database)
- `dev-tools/` - Development utilities and diagnostic scripts
- `docs/` - Comprehensive documentation
- `logs/` - Application log files
- `postman/` - API testing collections
- `scripts/` - Utility scripts
- `tests/` - Automated test suites

## 🚀 Running the Project

1.  **Install Dependencies**:
    First, install the necessary npm packages.
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables**:
    For the best security and ease of use, this project uses a `.env.local` file to manage API keys and secrets. Copy the example file to get started:
    ```bash
    cp .env.local.example .env.local
    ```
    Now, open `.env.local` and fill in your actual credentials. The values in this file will override any settings saved on the dashboard's settings page. This is the recommended way to manage sensitive data.

3.  **Run the Development Server**:
    Start the Next.js development server.
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002` for local development. In production the gateway is expected to be reachable at `https://apinotification.firstaden-bank.com` — set `APINOTIFICATION_URL` in `.env.local` to override.

## 🧪 Testing the API

You can test the API endpoint using `curl` or any API client like Postman.

## 🚀 Production Deployment

### Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```bash
# Production API Notification URL
APINOTIFICATION_URL=https://apinotification.firstaden-bank.com/

# Meta WhatsApp API Configuration
META_WHATSAPP_API_URL=https://graph.facebook.com/v20.0
META_WHATSAPP_TOKEN=your-permanent-access-token
META_WHATSAPP_NUMBER_ID=your-phone-number-id
META_WEBHOOK_VERIFY_TOKEN=your-verification-token
META_APP_SECRET=your-app-secret

# Vonage Configuration
VONAGE_API_URL=https://messages-sandbox.nexmo.com/v1/messages
VONAGE_API_KEY=82f67722
VONAGE_API_SECRET=bd8T07s2n@e@2zN2Q!J
VONAGE_FROM_NUMBER=967774577134

# Default Provider
DEFAULT_PROVIDER=meta
```

### Starting in Production Mode

```bash
# For development with production settings
npm run dev:prod

# For production deployment
npm run build
npm run start:prod
```

### Webhook Configuration

1. Set up your webhook URL to: `https://apinotification.firstaden-bank.com/api/webhooks/meta`
2. Use the `META_WEBHOOK_VERIFY_TOKEN` value as your verification token
3. Subscribe to the following events: `messages`, `message_deliveries`, `message_reads`

## 📋 Template-Based Messaging

To avoid message restrictions and ensure compliance with WhatsApp policies, this system uses template-based messaging:

- **Pre-approved Templates**: All messages are sent using pre-approved templates registered with Meta
- **Variable Substitution**: Dynamic content is injected into templates using parameters
- **Multi-language Support**: Templates are available in multiple languages (English and Arabic)

### Registering Templates

Register your message templates with Meta using:

```bash
npm run register-templates register
```

### Testing Template Messages

Send test template messages with:

```bash
# Send OTP code
npm run send-template otp <phone-number> <code> <expiry>

# Send transaction alert
npm run send-template transaction <phone-number> <account> <amount> <balance> <timestamp>

# Send Arabic transaction alert
npm run send-template transaction-ar <phone-number> <account> <amount> <balance> <timestamp>

# Send marketing promotion
npm run send-template marketing <phone-number> <product> <discount> <end-date>
```

### Testing Webhooks

Validate your webhook configuration with:

```bash
# Test verification
npm run test-webhook verify

# Test inbound message
npm run test-webhook inbound

# Test status update
npm run test-webhook status
```

**Endpoint**: `POST /api/whatsapp/send`

### Example `curl` Request

```bash
curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send \
-H "Content-Type: application/json" \
-d '{
      "provider": "vonage",
      "messageType": "TEXT",
      "to": "REPLACE_WITH_YOUR_WHATSAPP_NUMBER",
      "body": "Your account has been debited with 100 SAR.",
      "meta": {
        "sourceSystem": "T24",
        "companyId": "KSA",
        "txnId": "FT123456",
        "accountNo": "1234567890",
        "eventType": "DEBIT",
        "timestamp": "2025-12-06T10:15:30Z"
      }
    }'
```

### Response (Success)

```json
{
  "success": true,
  "provider": "vonage",
  "providerMessageId": "a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890",
  "rawResponse": {
    "message_uuid": "a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890"
  }
}
```

## ⚙️ Configuration

### Changing the Default Provider

The default provider is used when the `provider` field is not specified in the API request. You can change it in your `.env.local` file:

```env
# Options: "meta", "vonage", "generic", "direct"
DEFAULT_PROVIDER="vonage"
# Gateway public base URL used for webhooks/notify (override per-environment)
APINOTIFICATION_URL="https://apinotification.firstaden-bank.com"
```

### Managing Settings

You have two ways to manage provider settings:
1.  **Environment File (Recommended)**: Use the `.env.local` file for all credentials. This is the most secure method.
2.  **Settings Page**: You can also use the `/dashboard/settings` page to update URLs and other non-sensitive information. Note that any value set in `.env.local` will always take priority over what is saved on the settings page.

### Adding a New Provider

The application is designed to be easily extensible. To add a new WhatsApp provider:

1.  **Create a New Provider Class**:
    Create a new file in `src/providers/`, for example, `src/providers/NewAwesomeProvider.ts`.

2.  **Implement the Interface**:
    The new class must implement the `IWhatsAppProvider` interface from `src/providers/IWhatsAppProvider.ts`. This requires a `sendTextMessage` method.

    ```typescript
    // src/providers/NewAwesomeProvider.ts
    import type { IWhatsAppProvider } from './IWhatsAppProvider';
    import type { OutgoingMessagePayload, ProviderResult } from '@/lib/types';

    export class NewAwesomeProvider implements IWhatsAppProvider {
      async sendTextMessage(payload: OutgoingMessagePayload): Promise<ProviderResult> {
        // 1. Map the generic payload to this provider's specific format.
        const providerPayload = { ... };

        // 2. Make the API call using fetch.
        const response = await fetch('provider-api-url', { ... });
        const data = await response.json();

        // 3. Map the provider's response back to the standard ProviderResult.
        return {
          success: true,
          provider: 'new-awesome-provider',
          providerMessageId: data.id,
          rawResponse: data
        };
      }
    }
    ```

3.  **Update the Service**:
    In `src/services/WhatsAppNotificationService.ts`, import your new provider and add it to the `providers` map.

    ```typescript
    // src/services/WhatsAppNotificationService.ts
    import { NewAwesomeProvider } from '@/providers/NewAwesomeProvider';
    // ...

    constructor() {
      this.providers = {
        meta: new MetaWhatsAppProvider(),
        vonage: new VonageWhatsAppProvider(),
        generic: new GenericWhatsAppProvider(),
        'new-awesome-provider': new NewAwesomeProvider(), // Add here
      };
    }
    ```

4.  **Add Configuration**:
    Add any necessary environment variables for the new provider to `.env.local`.

## 🏷️ Arabic WhatsApp Templates

The system includes comprehensive Arabic banking notification templates for various operations:

- **Account Opening Notifications**: "عميلنا العزيز {customer_id} نود اعلامكم بانه تم فتح حسابكم {account_type} Product : {product_id}"
- **Deposit Notifications**: "تم ايداع {amount} إلى حسابك الذي ينتهي بـ {last_digits} بتاريخ {date} رصيد الحساب {currency} {balance}"
- **Withdrawal Notifications**: "تم خصم {amount} من حسابك المنتهي بـ {last_digits} بتاريخ {date} رصيد الحساب {currency} {balance}"
- **Additional Templates**: Balance inquiries, transaction alerts, card notifications, loan updates, investment information, and marketing messages

### Template Registration

Register all Arabic templates with Meta API using:

```bash
npm run register-arabic-templates
```

**Note:** Meta access tokens have expiration times. If you encounter authentication errors like "Session has expired", you'll need to generate a new access token from the Meta Developers Portal and update your `.env.local` file accordingly.

### Template Management

- Templates are managed through the dashboard at `/dashboard/templates`
- Supports variable substitution for dynamic content
- Includes reporting features to track template usage
- Professional analytics for template performance

### Using Templates

The system provides dedicated methods for sending templated messages:

```typescript
// Send account opening notification
await service.sendAccountOpeningNotification(
  '967774577134',
  {
    customerId: '1006541',
    accountType: 'Current Accounts - Demand$ حسابات جارية / أفراد',
    productId: '200000069697'
  },
  'vonage'
);

// Send deposit notification
await service.sendDepositNotification(
  '967774577134',
  {
    amount: '35,000.00',
    lastDigits: '********1097',
    date: '31 JUL 2025',
    currency: 'YER',
    balance: '40,419.94'
  }
);

// Send withdrawal notification
await service.sendWithdrawalNotification(
  '967774577134',
  {
    amount: '1,700.00',
    lastDigits: '********1871',
    date: '31 JUL 2025',
    currency: 'YER',
    balance: '11,844,285.68'
  }
);
```

## 📚 Additional Documentation

For comprehensive documentation, refer to the files in the [`docs/`](docs/) directory:

- **Setup Guides**: Installation and configuration instructions
- **Integration Guides**: Provider-specific setup and troubleshooting
- **API Documentation**: Detailed endpoint specifications
- **Technical Documentation**: Architecture and implementation details

## 🔧 Development Tools

Development utilities are located in the [`dev-tools/`](dev-tools/) directory:

- Database management and inspection scripts
- Integration testing tools
- Configuration verification utilities
- Diagnostic troubleshooting scripts

## 📝 Logging

Application logs are stored in the [`logs/`](logs/) directory with daily rotation.

## 🧪 Testing

Run automated tests:
```bash
npm test
npm run test:watch  # Continuous testing
```

## 🚀 Production — Full step‑by‑step commands (أمر‑بأمر)

The following is a complete, copy‑pasteable list of commands to prepare, deploy and verify the project in a production environment. Replace placeholder values (like `<...>`) with your real values.

### 1) Server preparation (Ubuntu example)
```bash
# update packages
sudo apt update && sudo apt upgrade -y

# install Node.js 20 (LTS) and build tools
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git

# optional: install PM2 for process management
sudo npm install -g pm2
```

### 2) Clone repository and install deps
```bash
# create app dir and clone
sudo mkdir -p /var/www && sudo chown $(whoami):$(whoami) /var/www
cd /var/www
git clone <repo-url> whatsapp
cd whatsapp

# install exact dependencies for production
npm ci
```

### 3) Prepare persistent storage & DB path
```bash
sudo mkdir -p /var/lib/whatsapp
sudo chown $(whoami):$(whoami) /var/lib/whatsapp
# set runtime env or export in service file: SQLITE_DB_PATH=/var/lib/whatsapp/gateway.db
```

### 4) Run DB migrations (one‑time / on deploy)
```bash
node migrations/run-migration.js
```

### 5) Set environment variables (example: temporary shell exports)
```bash
export NODE_ENV=production
export PORT=3000
export SQLITE_DB_PATH=/var/lib/whatsapp/gateway.db
export META_ACCESS_TOKEN="<META_ACCESS_TOKEN>"
export META_WHATSAPP_NUMBER_ID="<META_WHATSAPP_NUMBER_ID>"
export META_APP_SECRET="<META_APP_SECRET>"
export VONAGE_APPLICATION_ID="<VONAGE_APP_ID>"
# either provide private key file contents or path
export VONAGE_PRIVATE_KEY="$(cat /path/to/vonage_private.key)"
export DEFAULT_PROVIDER=meta
export LOG_LEVEL=info
```

> Note: For production put these into your secret manager, systemd unit, Docker secrets, or PM2 ecosystem file instead of exporting in shell.

### 6) Build the Next.js production bundle
```bash
npm run build
```

### 7a) Start with PM2 (recommended for simple servers)
```bash
pm2 start npm --name whatsapp-gateway -- start
pm2 save
pm2 status whatsapp-gateway
# view logs
pm2 logs whatsapp-gateway --lines 200
```

### 7b) OR create systemd service (example)
```bash
sudo tee /etc/systemd/system/whatsapp-gateway.service > /dev/null <<'EOF'
[Unit]
Description=WhatsApp Gateway
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/whatsapp
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=SQLITE_DB_PATH=/var/lib/whatsapp/gateway.db
Environment=META_ACCESS_TOKEN=<META_ACCESS_TOKEN>
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable whatsapp-gateway
sudo systemctl start whatsapp-gateway
sudo systemctl status whatsapp-gateway -l
sudo journalctl -u whatsapp-gateway -f
```

### 7c) OR run in Docker (recommended for containerized deployment)
```bash
# Example Dockerfile (project root)
cat > Dockerfile <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
EOF

# build image
docker build -t whatsapp-gateway:latest .

# run container (mount host folder for SQLite DB)
docker run -d --name whatsapp-gateway \
  -p 3000:3000 \
  -v /var/lib/whatsapp:/data \
  -e NODE_ENV=production \
  -e SQLITE_DB_PATH=/data/gateway.db \
  -e META_ACCESS_TOKEN="<META_ACCESS_TOKEN>" \
  whatsapp-gateway:latest
```

### 8) Register / Sync templates (production)
```bash
# If using the included registration script
NODE_ENV=production ts-node scripts/register-whatsapp-templates.ts
# or (if compiled/runtime JS available)
NODE_ENV=production node dist/scripts/register-whatsapp-templates.js
```

### 9) Post‑deploy smoke checks (run these immediately)
```bash
# 1) Health endpoint (adjust path if different)
curl -I https://your.domain.com/health || curl -I http://localhost:3000

# 2) Login (admin) — verify cookie set
curl -X POST https://your.domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<ADMIN_USERNAME>","password":"<ADMIN_PASSWORD>"}' -i

# 3) Send a test message (use provided scripts or API endpoint)
node scripts/send-whatsapp-templates.ts --to "+123456789" --template deposit_notification
# OR use API
curl -X POST https://your.domain.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"provider":"meta","messageType":"TEXT","to":"+123...","body":"Smoke test"}'

# 4) Check messages recorded in DB
sqlite3 /var/lib/whatsapp/gateway.db "SELECT id, provider, status, created_at FROM messages ORDER BY created_at DESC LIMIT 10;"

# 5) Check logs for delivery errors
pm2 logs whatsapp-gateway --lines 200
# or
sudo journalctl -u whatsapp-gateway -n 200
# or (docker)
docker logs -f whatsapp-gateway
```

### 10) Useful admin tasks / maintenance commands
```bash
# Restart service
pm2 restart whatsapp-gateway
# or
sudo systemctl restart whatsapp-gateway
# or (docker)
docker restart whatsapp-gateway

# Run DB migrations manually
node migrations/run-migration.js

# Run automated tests
npm test

# Tail logs during troubleshooting
pm2 logs whatsapp-gateway -f
```

---

If you want, I can add the above section to `docs/PRODUCTION_DEPLOYMENT.md`, create a `Dockerfile` and `docker-compose.production.yml`, or add a `systemd` service file under `deploy/` and open a PR — أي خيار تفضّل؟
#   w h a t s s a p p n o t i f a c t i o n  
 