# WhatsApp Messaging System - Technical Architecture Analysis

## 1. Service Server Location and Database Storage

### Server Location:
- The service is hosted as a Node.js/Next.js application
- Runs on a local server environment (can be deployed to cloud platforms like Google Cloud Run as indicated by `apphosting.yaml`)
- Gateway service runs on port 3002 by default (configurable via GATEWAY_PORT environment variable)
- Main application runs on port 9002 by default (configurable via NEXT_PUBLIC_PORT environment variable)

### Database Storage:
- Primary database: SQLite (file-based) stored as `gateway.db` in the application directory
- Database path configurable via `SQLITE_DB_PATH` environment variable (defaults to `process.cwd() + '/gateway.db'`)
- Database tables include:
  - `settings`: Application configuration settings
  - `providers`: Available messaging providers and their configurations
  - `routing_rules`: Rules for routing messages to specific providers
  - `messages`: Message logs and status tracking
  - `provider_priority`: Priority and fallback configurations for providers
  - `message_templates`: Predefined message templates for banking notifications

## 2. Integration with Yemeni Omani United Telecommunications Company

The system is designed to integrate with Yemeni telecommunications infrastructure through:

### Direct Provider Integration:
- Custom `FadSmsProvider` specifically designed for Yemeni carriers
- Configured endpoint: `http://10.220.172.100:7070/API/Service/Interface/v3/SendSMS`
- Authentication using username/password credentials
- This provider acts as a fallback option in the provider hierarchy

### Country-Specific Number Handling:
- Automatic normalization of phone numbers to Yemen country code (+967)
- If a number doesn't start with '+' or '967', the system automatically prepends '967'
- Supports both international format (+967...) and local formats

## 3. Traffic/Service Flow

```
Client Request (API Call) 
    ↓
Ingress Logging (Request captured and logged)
    ↓
Validation & Normalization (Phone number, message format)
    ↓
Transaction ID Generation
    ↓
Message Persistence (Stored in SQLite database with status 'RECEIVED')
    ↓
Provider Selection (Based on priority and availability)
    ↓
Message Dispatch (Sent to selected provider)
    ↓
Provider Processing (Specific provider handles API communication)
    ↓
Response Handling (Success/Failure with provider-specific message ID)
    ↓
Status Update (Database updated with final status)
    ↓
Egress Logging (Response logged with latency metrics)
    ↓
Result Returned (Transaction ID and QUEUED status to client)
```

## 4. High Level Design (HLD)

### System Architecture:
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │────│  Next.js Frontend│────│  WhatsApp APIs  │
│                 │    │                  │    │ (Meta, Vonage,  │
│ (Web/Mobile)    │    │ - Dashboard UI   │    │  Twilio, etc.) │
└─────────────────┘    │ - API Endpoints  │    └─────────────────┘
                       │ - Authentication │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   Gateway API    │
                       │  (Port 3002)     │
                       │ - Notification   │
                       │ - Admin Controls │
                       │ - Webhooks       │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   Data Storage   │
                       │ - SQLite DB      │
                       │ - File Logging   │
                       │ - Message Queue  │
                       └──────────────────┘
```

### Components Overview:
- **Frontend Layer**: Next.js application serving the dashboard and API endpoints
- **Gateway Layer**: Express.js service handling message routing and provider management
- **Provider Layer**: Multiple WhatsApp messaging providers with fallback mechanisms
- **Data Layer**: SQLite database and file-based logging system
- **Integration Layer**: External WhatsApp API providers (Meta, Vonage, Twilio, etc.)

## 5. Low Level Design (LLD)

### Core Classes and Their Responsibilities:

#### WhatsAppNotificationService
- Manages multiple provider instances (Meta, Vonage, Generic, Direct, FAD)
- Handles provider selection and fallback logic
- Processes outgoing messages with phone number normalization
- Implements comprehensive fallback chain logic

#### Provider Classes (implementing IWhatsAppProvider)
- MetaWhatsAppProvider: Handles Meta's WhatsApp Business API
- VonageWhatsAppProvider: Handles Vonage messaging platform
- GenericWhatsAppProvider: Handles generic webhook-style providers
- DirectWhatsAppProvider: Direct HTTP API integration
- FadSmsProvider: Specific provider for Yemeni telecom integration

#### Gateway Services
- NotifyController: Handles incoming notification requests
- DispatchService: Manages provider prioritization and retry logic
- ValidationService: Validates and normalizes input data
- TransactionIdService: Generates unique transaction IDs
- BankTemplatesService: Manages message templates for banking notifications

### Database Schema Details:
```
providers table:
- id: TEXT (provider identifier like 'meta', 'vonage', 'fad')
- enabled: INTEGER (0/1 flag to enable/disable provider)
- config: TEXT (JSON string with provider-specific configuration)

messages table:
- transId: TEXT (unique transaction ID)
- mobileNo: TEXT (normalized phone number)
- message: TEXT (message content)
- priority: TEXT (message priority)
- selectedProvider: TEXT (provider used)
- status: TEXT (RECEIVED, SENT, FAILED)
- providerMessageId: TEXT (provider's message ID)
- createdAt: TEXT (timestamp)
- updatedAt: TEXT (timestamp)
- lastError: TEXT (error details if any)

provider_priority table:
- provider_id: TEXT (foreign key to providers table)
- priority: INTEGER (order of preference)
- enabled: INTEGER (enable/disable this priority rule)
- channel: TEXT ('WHATSAPP' or 'SMS')
- fallback_provider_id: TEXT (next provider if this fails)
- retry_count: INTEGER (number of retry attempts)
- retry_delay_ms: INTEGER (delay between retries)
```

## 6. Logical Architecture

### System Components:
1. **Interface Layer**: Next.js frontend with REST API endpoints
2. **Business Logic Layer**: Message routing, provider selection, template processing
3. **Integration Layer**: Multiple WhatsApp provider adapters
4. **Data Access Layer**: SQLite database and file storage
5. **Logging Layer**: Multi-category logging system

### Operation Flow:
1. User initiates message send via dashboard API
2. System validates and normalizes the request
3. Message is persisted in database with RECEIVED status
4. Appropriate provider is selected based on priority configuration
5. Message is sent via the selected provider's API
6. Response is processed and status is updated
7. Both success and failure scenarios are logged appropriately

## 7. Interface Layer (IPs and Ports)

### Network Interfaces:
- **Main Application**: Port 9002 (configurable via NEXT_PUBLIC_PORT)
- **Gateway Service**: Port 3002 (configurable via GATEWAY_PORT)
- **Health Check Endpoint**: `/health` (available on both services)

### API Endpoints:
- **Frontend API**: `http://localhost:9002/api/*` (Next.js API routes)
- **Gateway API**: `http://localhost:3002/api/*` (Express.js routes)
- **Notification Endpoint**: `POST /api/notify` (Gateway)
- **Admin Provider Management**: `GET/POST /api/admin/providers` (Gateway)
- **Webhook Receivers**: `POST /api/webhooks/*` (Gateway)

### Database Connection:
- SQLite file database (no network ports required)
- Path: `./gateway.db` (or configured path via SQLITE_DB_PATH)

## 8. Supported Interfaces

### Web Interfaces:
- **Dashboard UI**: Modern Next.js interface with React components
- **Admin Panel**: Provider configuration and message monitoring
- **Message Templates**: Template management for banking notifications

### API Interfaces:
- **RESTful APIs**: Standard HTTP endpoints for message sending
- **Webhook Endpoints**: For receiving delivery confirmations and incoming messages
- **Health Check APIs**: System monitoring and status reporting

### Command-Line Interfaces:
- **npm Scripts**: Development, build, and deployment commands
- **Database Migration**: Automated schema creation and updates
- **Testing Framework**: Unit and integration tests

### Configuration Interfaces:
- **Environment Variables**: `.env.local` configuration
- **JSON Configuration Files**: Provider settings, templates, etc.
- **Database Configuration**: Dynamic provider settings via database

## 9. Log Types Available on Server

### Interface Logs:
- **Ingress Logs**: All incoming requests to the gateway
- Stored in: `src/gateway/logs/ingress/`
- Contains: Headers, request body, IP address, timestamp

### Running Logs:
- **API Logs**: General API request/response logging
- **Service Logs**: Internal service operations and state changes
- Stored in: `logs/YYYY/MM/DD/api.log`

### Debug Logs:
- **Vonage Debug**: Detailed Vonage provider communications
- **Meta Debug**: Detailed Meta WhatsApp API communications
- Stored in: `logs/YYYY/MM/DD/vonage_debug.log` and `meta_debug.log`

### Operation Logs:
- **Messages Logs**: All message transactions and status changes
- **SMS Delivery Logs**: SMS delivery status updates
- **Webhook Logs**: Incoming webhook events and processing
- Stored in: `logs/YYYY/MM/DD/messages.log`, `sms_delivery.log`, `webhooks.log`

### Error Logs:
- **General Errors**: System errors and exceptions
- **Fallback Logs**: Fallback mechanism operations and results
- Stored in: `logs/YYYY/MM/DD/errors.log`, `fallback.log`

### Audit Logs:
- **Security Events**: User logins, configuration changes, access logs
- **Compliance Tracking**: User actions for auditing purposes
- Stored in: `logs/YYYY/MM/DD/audit.log` and database table

## 10. Syslog Capability

The system currently implements a comprehensive file-based logging system but does NOT directly support syslog protocol out-of-the-box. However, syslog capability can be easily added:

### Current Logging Architecture:
- Hierarchical file-based logging system with date-based folders
- Multiple log categories with separate files
- Automatic directory creation and rotation

### Syslog Implementation Path:
1. **Enhanced Logger Module**: Modify `src/lib/logger.ts` to include syslog transport
2. **Configuration Option**: Add syslog server settings to `whatsapp-config.json`
3. **Dual Logging**: Maintain file logging while adding syslog capability

### Proposed Syslog Enhancement:
```javascript
// Would add to logger.ts
import dgram from 'dgram';

function logToSyslog(category: string, data: any) {
  const client = dgram.createSocket('udp4');
  const message = `<14>${new Date().toISOString()} [${category}] ${JSON.stringify(data)}`;
  client.send(message, 514, 'syslog-server-host', (err) => {
    if (err) console.error('Syslog error:', err);
    client.close();
  });
}
```

### Syslog Categories Mapping:
- Local0 facility for general messages
- Local1 facility for API operations
- Local2 facility for errors
- Local3 facility for audit events
- Local4 facility for delivery confirmations

---

## Summary

This WhatsApp messaging system is a robust, enterprise-grade solution designed specifically for banking environments with:
- Multi-provider redundancy and fallback mechanisms
- Country-specific number normalization for Yemen
- Comprehensive logging and audit trails
- Hierarchical database and file storage
- Flexible configuration and template management
- Built-in compliance and security features

The system is architected to provide reliable message delivery with automatic failover capabilities, making it suitable for mission-critical financial institution communications.