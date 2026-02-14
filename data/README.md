# Data Directory

This directory contains persistent data files for the WhatsApp Gateway application.

## Contents

### Database Files
- `gateway.db` - SQLite database containing:
  - Messages and message events
  - Provider configurations
  - Settings and preferences
  - Message templates
  - API logs and audit trails

### Data Structure
The database contains the following tables:
- `messages` - Stored message records
- `message_events` - Webhook event tracking
- `providers` - WhatsApp provider configurations
- `settings` - Application settings
- `api_logs` - API request/response logging
- `provider_priority` - Fallback chain configuration
- `message_templates` - Predefined message templates

## Important Notes
- This file should be backed up regularly
- Do not manually edit the database file
- Use the application's API or admin interface for data management
- The database is automatically created and managed by the application