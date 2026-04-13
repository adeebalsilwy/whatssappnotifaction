# A2A (Account to Account) Implementation Guide

This document outlines the implementation of the A2A (Account to Account) message fetching functionality in the WhatsApp Notification Gateway.

## Overview

The A2A system allows the application to:
- Fetch notifications from an A2A server
- Process these notifications automatically
- Send the messages via WhatsApp instead of SMS
- Track and monitor the messages through a dedicated dashboard
- Configure settings via environment variables

## Components

### 1. A2A Provider (`src/providers/A2AProvider.ts`)
- Handles fetching notifications from the A2A server
- Processes notifications and sends them via WhatsApp
- Integrates with the existing WhatsApp notification service
- Provides proper error handling and logging

### 2. A2A Configuration Service (`src/lib/a2a-config.ts`)
- Manages A2A-specific configuration
- Loads settings from environment variables
- Provides validation for configuration values

### 3. A2A Message Service (`src/services/A2AMessageService.ts`)
- Fetches notifications from the A2A server
- Sends messages via WhatsApp
- Stores message records in the database for tracking
- Supports periodic polling

### 4. A2A API Routes (`src/app/api/a2a/route.ts`)
- GET: Retrieve A2A messages with filtering
- POST: Trigger immediate fetch of notifications
- PUT: Start automatic polling
- DELETE: Stop automatic polling

### 5. A2A Dashboard (`src/app/dashboard/a2a/`)
- Real-time monitoring interface
- Message history and statistics
- Polling controls
- Configuration panel

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# A2A Configuration - LIVE Environment
A2A_LIVE_HOST=A2A-SMS-CONNECTOR.mepspay.com
A2A_LIVE_PORT=9312
A2A_LIVE_API_URL=/wsGetMailsNotification/API/A2A/GetbankNotificationsList
A2A_LIVE_SRV_ID=1
A2A_LIVE_USER_ID=User
A2A_LIVE_PASSWORD=123
A2A_LIVE_CHANNEL=MW
A2A_LIVE_BANK_CODE_HEADER=A2A
A2A_LIVE_BANK_CODE=1030200
A2A_LIVE_SENDER=FADBank
A2A_LIVE_CONNECTOR_ID=EN

# A2A Configuration - TEST Environment
A2A_TEST_HOST=172.125.65.7
A2A_TEST_PORT=8086
A2A_TEST_API_URL=/wsGetMailsNotification/API/A2A/GetbankNotificationsList/
A2A_TEST_SRV_ID=1
A2A_TEST_USER_ID=User
A2A_TEST_PASSWORD=123
A2A_TEST_CHANNEL=MW
A2A_TEST_BANK_CODE_HEADER=A2A
A2A_TEST_BANK_CODE=1029420
A2A_TEST_SENDER=FADBank
A2A_TEST_CONNECTOR_ID=EN

# A2A SMS Server Configuration (shared between live and test)
A2A_SMS_HOST=10.220.172.100
A2A_SMS_PORT=7070
A2A_SMS_API_URL=/API/Service/Interface/v3/SendSMS
A2A_SMS_USERNAME=Bank
A2A_SMS_PASSWORD=Bank@2024
A2A_SMS_USER_ID=124985

# A2A Polling Configuration
A2A_MODE=live  # Can be 'live' or 'test'
A2A_ENABLE_POLLING=false
A2A_POLLING_INTERVAL=30000
```

### Setup

Run the setup script to verify your configuration:

```bash
node dev-tools/setup-a2a-config.js
```

## Usage

### Dashboard Interface

Access the A2A dashboard at `/dashboard/a2a` to:

1. **Monitor Messages**: View recent A2A notifications
2. **Control Polling**: Start/stop automatic fetching
3. **Configure Settings**: Adjust polling intervals and settings
4. **Switch Modes**: Toggle between live and test environments
5. **Filter Messages**: Filter by status, phone number, or date

### API Endpoints

#### GET `/api/a2a`
Retrieve A2A messages with optional filtering:
- `status`: Filter by message status
- `mobileNo`: Filter by phone number
- `dateFrom`: Filter from date
- `dateTo`: Filter to date
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

#### POST `/api/a2a`
Trigger immediate fetch of A2A notifications

#### PUT `/api/a2a`
Start automatic polling with specified interval and mode:
```json
{
  "intervalMs": 30000,
  "mode": "live"  // or "test"
}
```

#### DELETE `/api/a2a`
Stop automatic polling

### Mode Switching

The system supports switching between live and test environments:

- **Live Mode**: Connects to production A2A server (A2A-SMS-CONNECTOR.mepspay.com:9312)
- **Test Mode**: Connects to test A2A server (172.125.65.7:8086)

You can switch modes:
1. Through the dashboard settings panel
2. By specifying the mode in API requests
3. By setting the `A2A_MODE` environment variable

The mode affects which server endpoints are used for fetching notifications.

### Programmatic Usage

You can programmatically use the A2A service:

```typescript
import { A2AMessageService } from '@/services/A2AMessageService';
import { loadA2AConfig } from '@/lib/a2a-config';

const a2aService = new A2AMessageService();
const config = loadA2AConfig();

// Fetch notifications immediately
const notifications = await a2aService.fetchA2ANotifications(config);

// Start periodic polling
a2aService.startPolling(config, 30000); // Every 30 seconds

// Stop polling
a2aService.stopPolling();
```

## Security

- All A2A credentials should be stored in environment variables
- The system uses the existing authentication middleware
- API endpoints require proper authentication for protected routes

## Monitoring and Logging

- All A2A operations are logged to the messages log
- Success and error states are tracked
- Message delivery status is recorded in the database
- Dashboard provides real-time statistics

## Troubleshooting

### Common Issues

1. **Configuration Errors**: Verify all environment variables are set correctly
2. **Connection Issues**: Check network connectivity to A2A server
3. **WhatsApp Delivery**: Ensure WhatsApp provider is properly configured
4. **Database Issues**: Verify database connection and permissions

### Logs

Check the application logs for A2A-related entries:
- Look for "A2A_FETCH_NOTIFICATIONS" entries
- Monitor "A2A_WHATSAPP_SENT" entries for delivery status
- Check for any error entries related to A2A operations

## Integration with Existing System

The A2A implementation integrates seamlessly with:
- Existing WhatsApp notification service
- Database schema and message tracking
- Authentication and authorization system
- Dashboard interface and sidebar navigation
- Error handling and logging infrastructure

## Deployment Notes

1. Ensure all A2A environment variables are set in production
2. Configure appropriate polling intervals based on your needs
3. Monitor resource usage as polling runs continuously
4. Set up proper error handling and alerting for production environments