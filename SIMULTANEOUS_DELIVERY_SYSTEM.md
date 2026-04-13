# Simultaneous WhatsApp + FAD Delivery System

## Overview
This system has been enhanced to send messages simultaneously via both Meta WhatsApp API and FAD SMS API, with professional logging for complete audit trails.

## Key Features

### 1. Simultaneous Delivery
- Messages are sent concurrently to both Meta WhatsApp and FAD SMS providers
- Success is reported if at least one provider delivers successfully
- Detailed timing and performance metrics for each provider

### 2. Professional Logging System
- **Hierarchical Directory Structure**: `logs/YYYY/MM/DD/category.log`
- **Multiple Log Categories**:
  - `simultaneous_delivery.log` - Overall delivery coordination
  - `meta_delivery.log` - Meta WhatsApp specific logs
  - `fad_delivery.log` - FAD SMS specific logs
  - `messages.log` - General message logs
- **Structured JSON Format**: Each log entry contains timestamp, action, and detailed data

### 3. Enhanced Error Handling
- Comprehensive error tracking for both providers
- Detailed failure reasons and error codes
- Exception logging with stack traces
- Configuration validation logging

## System Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   API Request   │────│ WhatsAppNotification │────│  Meta Provider  │
│                 │    │    Service           │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
                                │                           │
                                │            ┌──────────────┘
                                │            │
                                ▼            ▼
                       ┌─────────────────────────┐
                       │   Simultaneous Delivery │
                       │    (Promise.all)        │
                       └─────────────────────────┘
                                │            │
                                │            ▼
                                │    ┌─────────────────┐
                                │    │  FAD Provider   │
                                │    │                 │
                                │    └─────────────────┘
                                │
                                ▼
                      ┌─────────────────────┐
                      │  Professional Logs  │
                      │  (Date-structured)  │
                      └─────────────────────┘
```

## Configuration

### Environment Variables
```bash
# Meta WhatsApp Configuration
META_WHATSAPP_API_URL=https://graph.facebook.com/v24.0
META_WHATSAPP_TOKEN=your_meta_token
META_WHATSAPP_NUMBER_ID=your_number_id
WABA_ID=your_waba_id

# FAD SMS Configuration
FAD_API_URL=https://api.fad.ye/sms/send
FAD_USERNAME=your_fad_username
FAD_PASSWORD=your_fad_password

# General Configuration
DEFAULT_PROVIDER=meta
APINOTIFICATION_URL=https://apinotification.firstaden-bank.com/
```

### Provider Configuration Structure
```json
{
  "providers": {
    "meta": {
      "url": "https://graph.facebook.com/v24.0",
      "token": "your_token",
      "numberId": "your_number_id"
    },
    "fad": {
      "url": "https://api.fad.ye/sms/send",
      "username": "your_username",
      "password": "your_password"
    }
  }
}
```

## API Usage

### Endpoint
```http
POST https://apinotification.firstaden-bank.com/api/whatsapp/send
Content-Type: application/json
```

### Request Body
```json
{
  "message": "Your message content here",
  "to": "+967774577134",
  "messageType": "TEXT", // or "TEMPLATE"
  "templateId": "arabic_general_notification", // optional
  "variables": { "1": "variable_value" } // optional
}
```

### Response Format
```json
{
  "success": true,
  "provider": "simultaneous",
  "providerMessageId": "meta_message_id_or_fad_id",
  "rawResponse": {
    "meta": {
      "success": true,
      "providerMessageId": "wamid.HBg...",
      "errorCode": null,
      "errorMessage": null
    },
    "fad": {
      "success": true,
      "providerMessageId": "fad_transaction_id",
      "errorCode": null,
      "errorMessage": null
    },
    "totalTimeMs": 1250
  },
  "metadata": {
    "transactionId": "simultaneous-1708030800000-abc123",
    "metaSuccess": true,
    "fadSuccess": true,
    "metaMessageId": "wamid.HBg...",
    "fadMessageId": "fad_transaction_id",
    "deliveryTimeMs": 1250
  }
}
```

## Log Structure Examples

### Simultaneous Delivery Log
```json
{
  "timestamp": "2026-02-15T10:30:00.000Z",
  "category": "simultaneous_delivery",
  "transactionId": "simultaneous-1708030800000-abc123",
  "action": "DELIVERY_COMPLETED",
  "totalTimeMs": 1250,
  "meta": {
    "success": true,
    "providerMessageId": "wamid.HBg...",
    "errorCode": null
  },
  "fad": {
    "success": true,
    "providerMessageId": "fad_1708030800123",
    "errorCode": null
  },
  "overallSuccess": true
}
```

### Provider-Specific Log (Meta)
```json
{
  "timestamp": "2026-02-15T10:30:00.100Z",
  "category": "meta_delivery",
  "action": "SEND_SUCCESS",
  "recipient": "+967774577134",
  "messageIds": ["wamid.HBg..."],
  "durationMs": 850
}
```

### Provider-Specific Log (FAD)
```json
{
  "timestamp": "2026-02-15T10:30:00.150Z",
  "category": "fad_delivery",
  "action": "SEND_SUCCESS",
  "transactionId": "fad_1708030800123",
  "recipient": "774577134",
  "messageReference": "MSG001",
  "durationMs": 400
}
```

## Testing

### Run the test script:
```bash
node scripts/test-simultaneous-delivery.js
```

### Manual Testing:
```bash
curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message","to":"+967774577134"}'
```

## Log Directory Structure
```
logs/
├── 2026/
│   ├── 02/
│   │   ├── 15/
│   │   │   ├── simultaneous_delivery.log
│   │   │   ├── meta_delivery.log
│   │   │   ├── fad_delivery.log
│   │   │   └── messages.log
│   │   └── 16/
│   │       ├── simultaneous_delivery.log
│   │       ├── meta_delivery.log
│   │       ├── fad_delivery.log
│   │       └── messages.log
│   └── 03/
│       └── 01/
└── 2025/
    └── 12/
        └── 31/
```

## Benefits

1. **Enhanced Reliability**: Dual delivery ensures message receipt even if one provider fails
2. **Comprehensive Audit Trail**: Professional logging for compliance and debugging
3. **Performance Monitoring**: Detailed timing metrics for optimization
4. **Flexible Configuration**: Easy provider configuration and management
5. **Robust Error Handling**: Graceful degradation and detailed error reporting
6. **Template Support**: Professional message formatting for both providers

## Error Codes

### System Errors
- `PROVIDER_MISSING` - Required providers not configured
- `SIMULTANEOUS_DELIVERY_ERROR` - General simultaneous delivery error

### Provider Errors
- `CONFIGURATION_ERROR` - Provider not properly configured
- `FAD_API_ERROR` - FAD API specific errors
- `FAD_EXCEPTION` - FAD provider exceptions
- `FETCH_ERROR` - Meta API connection errors
- `PROVIDER_ERROR` - General provider errors

## Monitoring

The system provides detailed monitoring through:
- Success/failure rates per provider
- Delivery timing metrics
- Error pattern analysis
- Configuration health checks
- Transaction tracking

All logs are stored in date-organized directories for easy retrieval and analysis.