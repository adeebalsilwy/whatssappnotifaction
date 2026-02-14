# Notification Gateway

A centralized notification gateway for Temenos (T24/TAFJ) handling WhatsApp (Meta, Vonage, Twilio) and Legacy SMS.

## Features
- **Clean Architecture** (Node.js + Express + TypeScript)
- **SQLite Storage** for settings, messages, and routing rules.
- **JSON File Logging** for Ingress and Egress payloads (Audit Trail).
- **Multi-Provider Support**: Meta WhatsApp, Vonage, Twilio, Legacy SMS.
- **Smart Routing**: Priority-based and Fallback logic.

## Requirement
- Node.js v18+
- npm

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configuration**
   Create `.env.local`:
   ```env
   GATEWAY_PORT=3001
   SQLITE_DB_PATH=gateway.db
   ```

3. **Run Development Server**
   ```bash
   npx nodemon src/gateway/server.ts
   # OR
   npm run gateway:dev
   ```

## API Usage

### Send Notification
**POST** `/api/notify`
```json
{
  "message": "Your OTP is 1234",
  "mobileNo": "774577134",
  "transID": "optional-custom-id",
  "priority": "HIGH"
}
```

### Admin
**GET** `/api/admin/providers`
**PUT** `/api/admin/providers/:id`

## Internal Details
- Logs are stored in `src/gateway/logs/`.
- Database file is `gateway.db`.
- To add a new provider, implement `IProvider` interface in `src/gateway/providers/` and register in `DispatchService`.
