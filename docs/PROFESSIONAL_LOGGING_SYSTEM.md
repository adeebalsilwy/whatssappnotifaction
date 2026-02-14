# Professional Hierarchical Logging System

## Overview
This document describes the newly implemented professional hierarchical logging system that organizes log files in a structured folder hierarchy by year, month, and day.

## New Folder Structure

### Hierarchical Organization
```
logs/
├── 2026/                    # Year folder
│   ├── 01/                 # Month folder (01-12)
│   │   ├── 31/            # Day folder (01-31)
│   │   │   ├── messages.log
│   │   │   ├── api.log
│   │   │   ├── errors.log
│   │   │   ├── webhooks.log
│   │   │   ├── vonage_debug.log
│   │   │   └── meta_debug.log
│   │   └── 30/
│   │       └── ... (similar structure)
│   └── 02/
│       └── ... (future months)
└── 2025/                   # Previous years
    └── 12/
        └── 07/
            └── ... (archived logs)
```

## Key Features

### 1. Automatic Folder Creation
- Folders are created automatically when logs are written
- Year/month/day folders created with proper zero-padding
- Recursive directory creation ensures all parent folders exist

### 2. Category-Based Files
Each day contains separate log files for different categories:
- **messages.log**: WhatsApp message logs
- **api.log**: API request/response logs
- **errors.log**: Error and exception logs
- **webhooks.log**: Incoming webhook logs
- **vonage_debug.log**: Vonage provider debug logs
- **meta_debug.log**: Meta/Facebook provider debug logs

### 3. Professional Log Format
Each log entry follows the format:
```
[TIMESTAMP] JSON_DATA
```

Example:
```
[2026-01-31T13:39:05.435Z] {"timestamp":"2026-01-31T13:39:05.435Z","provider":"meta","to":"+967774577134","body":"Test message","providerResult":{"success":true}}
```

## Implementation Details

### Logger Module (`src/lib/logger.ts`)
- **Modified Functions**:
  - `ensureLogDirectory()`: Now creates hierarchical structure
  - `logToFile()`: Writes to date-specific folder structure
  - `getLogs()`: Reads from hierarchical folder structure
- **New Functions**:
  - `getLogDates()`: Returns available years/months/days for navigation
  - `getLogsByDate()`: Gets logs for specific date and category

### API Endpoints

#### 1. Get Available Log Dates
```
GET /api/logs/dates
```
Returns hierarchical date structure:
```json
{
  "success": true,
  "data": {
    "years": [2026, 2025],
    "months": {
      "2026": [1],
      "2025": [12]
    },
    "days": {
      "2026-01": [31, 30],
      "2025-12": [7]
    }
  }
}
```

#### 2. Get Logs by Date
```
GET /api/logs/date?year=2026&month=1&day=31&category=messages&limit=100
```
Returns logs for specific date:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "year": 2026,
    "month": 1,
    "day": 31,
    "category": "messages",
    "count": 5
  }
}
```

## Migration Strategy

### Backward Compatibility
- Existing flat log files (`logs/*.log`) are preserved
- New logs are written to hierarchical structure
- `getLogs()` function reads from both old and new structures
- No data loss during transition

### File Migration (Optional)
To migrate existing logs to new structure:
```bash
# This would be implemented as a migration script
node scripts/migrate-logs.js
```

## Benefits

### 1. Improved Organization
- Easy navigation and file management
- Logical grouping by time periods
- Reduced file sizes per directory

### 2. Better Performance
- Faster file access for specific dates
- Efficient directory traversal
- Reduced I/O operations

### 3. Enhanced Maintainability
- Clear folder structure for archival
- Easy backup and cleanup operations
- Professional enterprise-grade organization

### 4. Scalability
- Handles large volume of logs efficiently
- Easy to implement retention policies
- Supports automated log rotation

## Usage Examples

### Writing Logs
```typescript
import { logToFile } from '@/lib/logger';

// Automatically creates folder structure and writes log
await logToFile('messages', {
  timestamp: new Date().toISOString(),
  provider: 'meta',
  to: '+967774577134',
  body: 'Hello World'
});
```

### Reading Logs
```typescript
import { getLogs, getLogsByDate } from '@/lib/logger';

// Get recent logs (backward compatible)
const recentLogs = await getLogs(100);

// Get logs for specific date
const dailyLogs = await getLogsByDate(2026, 1, 31, 'messages', 50);
```

### API Usage
```javascript
// Get available dates
const dates = await fetch('/api/logs/dates');

// Get logs for specific date
const response = await fetch('/api/logs/date?year=2026&month=1&day=31&category=messages');
const data = await response.json();
```

## Dashboard Integration

### Logs Page Enhancement
The dashboard logs page now:
- Shows hierarchical date navigation
- Loads logs dynamically by date selection
- Maintains backward compatibility
- Provides better user experience for log browsing

### Component Updates
- `LogsClient`: Added date selection and loading states
- `LogsFilters`: Extended with date navigation controls
- `LogsTable`: Enhanced with loading indicators

## Future Enhancements

### Planned Features
1. **Log Archival**: Automated compression and archiving of old logs
2. **Retention Policies**: Configurable log retention periods
3. **Search Functionality**: Full-text search across log files
4. **Export Options**: CSV/JSON export of log data
5. **Analytics Dashboard**: Log statistics and trends visualization
6. **Alerting System**: Notifications for error patterns

### Performance Optimizations
- Log file indexing for faster searches
- Caching of frequently accessed log data
- Asynchronous log processing
- Memory-efficient log reading

## Conclusion

This professional hierarchical logging system provides:
- **Enterprise-grade organization** of log files
- **Improved performance** for log access and management
- **Backward compatibility** with existing logs
- **Scalable architecture** for growing log volumes
- **Professional user experience** for log browsing

The system is production-ready and maintains all existing functionality while providing enhanced organization and performance benefits.