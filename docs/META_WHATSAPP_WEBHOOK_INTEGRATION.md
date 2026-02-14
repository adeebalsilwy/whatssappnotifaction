# Meta WhatsApp Business API Webhook Integration Guide

## 📘 Overview

This document provides comprehensive instructions for setting up Meta WhatsApp Business API webhooks with professional SQLite database integration for enterprise-grade message handling and tracking.

## 🏗️ System Architecture

### Components
- **Next.js Application** (Port 9002) - Main API gateway
- **Meta WhatsApp Business API** - Official WhatsApp messaging platform
- **SQLite Database** - Local storage for messages, events, and configuration
- **Webhook Handlers** - Real-time notification processing
- **Ngrok Tunnel** - Public HTTPS endpoint for webhook callbacks

## 🔧 Prerequisites

### Required Software
- Node.js 18+ 
- npm/yarn package manager
- Ngrok (for local development)
- SQLite3 (included in dependencies)

### Meta Developer Account
- Facebook Business Manager account
- WhatsApp Business Account
- Meta Developer App with WhatsApp product enabled

## 📁 Project Structure

```
whatsapp/
├── src/
│   ├── app/api/webhooks/meta/          # Webhook handlers
│   │   ├── route.ts                    # Main webhook endpoint
│   │   ├── inbound/route.ts            # Incoming messages handler
│   │   └── status/route.ts             # Status updates handler
│   ├── gateway/storage/sqlite/         # SQLite database
│   │   ├── db.ts                       # Database initialization
│   │   ├── repositories/               # Data access layer
│   │   └── migrations/                 # Database migrations
│   ├── server/                         # Database repositories
│   │   ├── repository.ts               # Message operations
│   │   └── settingsRepo.ts             # Configuration management
│   └── services/
│       └── WhatsAppNotificationService.ts # Core notification service
├── .env.local                          # Environment configuration
└── gateway.db                          # SQLite database file
```

## ⚙️ Environment Configuration

### .env.local Settings (Lines 6-9)

> Security: For production you should set `META_APP_SECRET` to enable `X-Hub-Signature-256` verification. See `docs/META_WEBHOOK_SECURITY.md` for details.

```env
# Meta WhatsApp API Configuration
META_WHATSAPP_API_URL="https://graph.facebook.com/v24.0"
META_WHATSAPP_NUMBER_ID="941421395727613"
META_WHATSAPP_TOKEN="EAAJTmdOZCOoUBQmfA0RRQ3lZCJsrt5pFLCRvYZCue0vi1mzQYG9Ufuhqw7uZARejkJrIzZCrtlSGegkyuIttFFPnluuqC86N1xNmhyZA7QOIXNr0XH2P8NFsJ37nU56qhbKNnd6gA0jwA7sTLeFhKKqTCnvtiAoLHiLUI1UZCxrs1q26XA3VWuTZBWFLImIIMHFP2QZDZD"
META_WEBHOOK_VERIFY_TOKEN="774577"
```

### Database Configuration
```env
# SQLite Database Path (Optional - defaults to gateway.db)
SQLITE_DB_PATH=./gateway.db

# PostgreSQL Alternative (if preferred)
# DB_URL=postgresql://username:password@localhost:5432/whatsapp_gateway
# DATABASE_URL=postgresql://username:password@localhost:5432/whatsapp_gateway
```

## 🛠️ Installation and Setup

### 1. Install Dependencies
```bash
npm install
npm install -g ngrok
```

### 2. Initialize Database
The SQLite database will be automatically initialized when the application starts. Tables created:
- `settings` - Application configuration
- `providers` - Provider configurations
- `messages` - Message records and status tracking
- `message_events` - Detailed event logging
- `api_logs` - API request/response logging
- `provider_priority` - Provider routing rules
- `message_templates` - Predefined message templates

### 3. Start Development Server
```bash
npm run dev
# Server starts on http://localhost:9002
```

### 4. Expose Local Server with Ngrok
```bash
ngrok http 9002
```

Note the HTTPS URL provided by ngrok (e.g., `https://abcd1234.ngrok.io`)

## 🔗 Webhook Configuration

### Meta Developer Console Setup

1. **Navigate to Webhooks Section**
   - Go to Meta Developer Portal
   - Select your App → WhatsApp → Configuration
   - Click "Manage" under Webhooks

2. **Configure Callback URL**
   ```
   Callback URL: https://abcd1234.ngrok.io/api/webhooks/meta
   Verify Token: 774577
   ```

3. **Subscribe to Events**
   Select the following subscription fields:
   - `messages` - For incoming messages
   - `message_deliveries` - For delivery confirmations
   - `message_reads` - For read receipts
   - `message_sent` - For sent confirmations

4. **Test Webhook Verification**
   ```bash
   curl -X GET "https://abcd1234.ngrok.io/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=774577&hub.challenge=123456"
   ```
   Expected response: `123456`

## 📊 Database Schema

### Messages Table
```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    referenceId VARCHAR(64),
    sender VARCHAR(64),
    to VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    providerMessageId VARCHAR(128),
    priority VARCHAR(16),
    metadata JSONB,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);
```

### Message Events Table
```sql
CREATE TABLE message_events (
    id BIGSERIAL PRIMARY KEY,
    messageId BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    eventType VARCHAR(32) NOT NULL,
    eventPayload JSONB,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);
```

### Status Mapping
| Meta Status | Internal Status |
|-------------|----------------|
| `sent`      | SENT           |
| `delivered` | DELIVERED      |
| `read`      | SEEN           |
| `failed`    | FAILED         |

## 🔄 Webhook Event Processing

### Incoming Message Flow
1. **Webhook Receipt**: Meta sends POST request to `/api/webhooks/meta`
2. **Message Parsing**: Extract message content, sender, timestamp
3. **Database Storage**: Save to `messages` table with status `RECEIVED`
4. **Event Logging**: Record in `message_events` table
5. **Business Logic**: Trigger notification service processing

### Status Update Flow
1. **Status Notification**: Meta sends status updates
2. **Status Mapping**: Convert Meta status to internal representation
3. **Database Update**: Update message status in `messages` table
4. **Event Recording**: Log status change in `message_events` table

## 🔍 Testing and Validation

### Send Test Message
```bash
curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send \\
  -H "Content-Type: application/json" \
  -d '{
    "to": "+967774577134",
    "body": "Test message from Meta WhatsApp API",
    "meta": {
      "txnId": "test-123",
      "sourceSystem": "TestSystem"
    }
  }'
```

### Expected Response
```json
{
  "success": true,
  "provider": "meta",
  "providerMessageId": "wamid.HBgMOTY3Nzc0NTc3MTM0FQIAERgS...",
  "rawResponse": {
    "messaging_product": "whatsapp",
    "contacts": [{"input": "+967774577134", "wa_id": "967774577134"}],
    "messages": [{"id": "wamid.HBgMOTY3Nzc0NTc3MTM0FQIAERgS..."}]
  }
}
```

### Verify Database Records
```sql
-- Check sent messages
SELECT * FROM messages WHERE to = '+967774577134' ORDER BY createdAt DESC;

-- Check message events
SELECT * FROM message_events WHERE messageId IN (
    SELECT id FROM messages WHERE to = '+967774577134'
) ORDER BY createdAt DESC;
```

## 🛡️ Security Considerations

### Webhook Verification
- Verify token validation prevents unauthorized webhook calls
- HTTPS requirement ensures encrypted communication
- Signature verification (recommended for production)

### Data Protection
- Sensitive data masked in logs
- Database encryption for production environments
- Regular backup procedures

## 📈 Monitoring and Troubleshooting

### Log Files
- `logs/messages-YYYY-MM-DD.log` - Message transactions
- `logs/api-YYYY-MM-DD.log` - API requests/responses
- `logs/errors-YYYY-MM-DD.log` - Error events
- `logs/meta_debug-YYYY-MM-DD.log` - Meta webhook debug info

### Health Checks
```bash
# Webhook endpoint health
curl https://apinotification.firstaden-bank.com/api/webhooks/meta

# Inbound webhook
curl https://apinotification.firstaden-bank.com/api/webhooks/meta/inbound

# Status webhook
curl https://apinotification.firstaden-bank.com/api/webhooks/meta/status
```

### Common Issues
1. **Webhook Verification Failed**: Check verify token matches
2. **Database Connection Errors**: Verify `SQLITE_DB_PATH` or database permissions
3. **Message Not Delivered**: Check Meta account status and number registration
4. **Ngrok Tunnel Issues**: Restart ngrok and update Meta console with new URL

## 🚀 Production Deployment

### Required Changes
1. **Replace Ngrok**: Use proper SSL certificate and domain
2. **Database Migration**: Move from SQLite to PostgreSQL for production
3. **Environment Variables**: Use secure secrets management
4. **Monitoring Setup**: Implement logging aggregation and alerting

### Scaling Considerations
- Load balancing for high-volume messaging
- Database connection pooling
- Redis caching for frequent operations
- CDN for static assets

## 📞 Support Resources

### Official Documentation
- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/webhooks)
- [Business Messaging Guide](https://business.whatsapp.com/blog/how-to-use-webhooks-from-whatsapp-business-api)

### Community and Help
- Meta Developer Community
- Stack Overflow (whatsapp-business-api tag)
- GitHub Issues for this project

---

*Last Updated: January 29, 2026*
*Version: 1.0*