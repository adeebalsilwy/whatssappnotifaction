# WhatsApp Cloud API Postman Collection

This collection provides comprehensive testing capabilities for the WhatsApp Cloud API integration with the notification gateway.

## Environment Setup

Import the `whatsapp-env.postman_environment.json` file into Postman to configure all required environment variables.

### Required Environment Variables

- `APINOTIFICATION_URL`: Your production API notification URL (e.g., `https://apinotification.firstaden-bank.com/`)
- `META_WHATSAPP_API_URL`: Meta WhatsApp API URL (e.g., `https://graph.facebook.com/v24.0`)
- `META_WHATSAPP_NUMBER_ID`: Your WhatsApp Business Account phone number ID
- `META_WHATSAPP_TOKEN`: Your permanent access token
- `META_WEBHOOK_VERIFY_TOKEN`: Your webhook verification token
- `META_APP_SECRET`: Your app secret for signature verification

### Additional Variables for Templates

- `recipient_phone_number`: The recipient's phone number in international format
- `template_name`: The name of the template to send
- `language_code`: Language code for the template (e.g., `en_US`, `ar_AR`)
- `variable_1`, `variable_2`: Template variables to populate

## Available Requests

### Messages

The collection includes various message sending options:

1. **Send Text Message**: Basic text message without templates
2. **Send Text Message Template**: Sends a predefined template
3. **Send Text Message with Variables**: Sends a template with dynamic variables
4. **Send Payment Request Template**: For payment-related notifications
5. **Send Bank Transaction Alert**: For financial transaction notifications (supports Arabic)
6. **Send OTP Code Template**: For one-time password delivery
7. **Send Marketing Promotion Template**: For promotional content
8. **Send Document Template**: For document sharing with URL buttons

### Webhooks

The collection includes webhook testing endpoints:

1. **Webhook Verification**: Tests the webhook verification process
2. **Webhook Inbound Message**: Simulates receiving an inbound message
3. **Webhook Message Status**: Updates on message delivery status
4. **Webhook Message Status - Delivered**: Specific for delivered status
5. **Webhook Message Status - Read**: Specific for read status
6. **Webhook Message Status - Failed**: Specific for failed messages

## Using Message Templates

Using templates is crucial for avoiding message restrictions. Templates are pre-approved messages that can be sent to users:

- **Transactional Templates**: For sending account notifications, purchase receipts, etc.
- **Marketing Templates**: For promotional content (requires user consent)
- **OTP Templates**: For authentication flows

### Template Best Practices

1. **Pre-approval**: All templates must be pre-approved by Meta
2. **Language Variants**: Create templates in multiple languages as needed
3. **Variables**: Use variables for dynamic content within templates
4. **Compliance**: Follow Meta's template policies to avoid restrictions

## Webhook Configuration

To configure webhooks for your WhatsApp Business Account:

1. Set the callback URL to: `{{APINOTIFICATION_URL}}/api/webhooks/meta`
2. Use `{{META_WEBHOOK_VERIFY_TOKEN}}` as the verification token
3. Subscribe to the following events:
   - `messages`: For inbound messages and message status updates
   - `message_deliveries`: For delivery receipts
   - `message_reads`: For read receipts

## Security Considerations

1. **Signature Verification**: Webhook requests include `X-Hub-Signature-256` header for verification
2. **Secure Storage**: Store access tokens and secrets securely
3. **Rate Limits**: Be aware of API rate limits when sending bulk messages

## Testing Guidelines

1. Start with the "Webhook Verification" request to ensure your endpoint is configured correctly
2. Use test phone numbers for initial message sending
3. Monitor webhook logs to ensure proper message status updates
4. Verify that template messages are rendering correctly with variables

## Troubleshooting

Common issues and solutions:

- **403 Forbidden**: Check that your access token is valid and has proper permissions
- **Webhook Verification Failure**: Verify that your verification token matches the one configured in Meta
- **Template Not Found**: Ensure the template name is exactly as registered with Meta
- **Rate Limit Exceeded**: Implement proper rate limiting and retry logic

## Production Deployment

When deploying to production:

1. Ensure all environment variables are properly configured
2. Verify that your webhook endpoint is publicly accessible via HTTPS
3. Test all message flows before going live
4. Monitor logs for any delivery issues
5. Have a fallback mechanism for message delivery failures