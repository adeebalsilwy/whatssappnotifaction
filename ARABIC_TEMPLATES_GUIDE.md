# Comprehensive Arabic Banking Templates for WhatsApp Cloud API

This document provides a complete guide to the Arabic banking notification templates integrated into the WhatsApp Cloud API system.

## Overview

The system includes comprehensive Arabic banking templates covering various banking scenarios:

- Account opening notifications
- Transaction alerts (deposits, withdrawals)
- Balance inquiries
- Card notifications
- Loan updates
- Investment information
- Marketing messages

## Template Categories

### 1. Account Update Templates (`ACCOUNT_UPDATE`)

- **Account Opening Notifications**
  - `arabic_account_opening`: General account opening notification
  - `arabic_savings_account_opening`: Savings account opening
  - `arabic_corporate_account_opening`: Corporate account opening
  - `arabic_demand_account_opening`: Demand/current account opening
  - `arabic_mudaraba_deposit_opening`: Investment deposit opening
  - `arabic_minor_savings_account_opening`: Minor savings account opening
  - `arabic_staff_account_opening`: Staff account opening

- **General Notifications**
  - `arabic_balance_inquiry`: Balance inquiry responses
  - `arabic_transaction_alert`: Transaction alerts
  - `arabic_low_balance_warning`: Low balance warnings
  - `arabic_card_activation`: Card activation confirmations
  - `arabic_card_blocked`: Card blocking notifications
  - `arabic_insurance_claim`: Insurance claim updates
  - `arabic_investment_update`: Investment performance updates

### 2. Payment Update Templates (`PAYMENT_UPDATE`)

- **Transaction Notifications**
  - `arabic_deposit_notification`: Deposit confirmations
  - `arabic_withdrawal_notification`: Withdrawal confirmations
  - `arabic_generic_payment_notification`: General payment notifications
  - `arabic_cheque_deposited`: Cheque deposit confirmations
  - `arabic_loan_disbursement`: Loan disbursement notifications
  - `arabic_loan_repayment_reminder`: Loan repayment reminders

### 3. Marketing Templates (`MARKETING`)

- **Promotional Content**
  - `arabic_welcome_message`: Welcome messages for new customers
  - `arabic_promotional_offer`: Promotional offers and campaigns

## Template Categories

### 1. Account Update Templates (`ACCOUNT_UPDATE`)

- **Account Opening Notifications**
  - `arabic_account_opening`: General account opening notification
  - `arabic_savings_account_opening`: Savings account opening
  - `arabic_corporate_account_opening`: Corporate account opening
  - `arabic_demand_account_opening`: Demand/current account opening
  - `arabic_mudaraba_deposit_opening`: Investment deposit opening
  - `arabic_minor_savings_account_opening`: Minor savings account opening
  - `arabic_staff_account_opening`: Staff account opening

- **General Notifications**
  - `arabic_balance_inquiry`: Balance inquiry responses
  - `arabic_transaction_alert`: Transaction alerts
  - `arabic_low_balance_warning`: Low balance warnings
  - `arabic_card_activation`: Card activation confirmations
  - `arabic_card_blocked`: Card blocking notifications
  - `arabic_insurance_claim`: Insurance claim updates
  - `arabic_investment_update`: Investment performance updates

### 2. Payment Update Templates (`PAYMENT_UPDATE`)

- **Transaction Notifications**
  - `arabic_deposit_notification`: Deposit confirmations
  - `arabic_withdrawal_notification`: Withdrawal confirmations
  - `arabic_generic_payment_notification`: General payment notifications
  - `arabic_cheque_deposited`: Cheque deposit confirmations
  - `arabic_loan_disbursement`: Loan disbursement notifications
  - `arabic_loan_repayment_reminder`: Loan repayment reminders

### 3. Marketing Templates (`MARKETING`)

- **Promotional Content**
  - `arabic_welcome_message`: Welcome messages for new customers
  - `arabic_promotional_offer`: Promotional offers and campaigns

## Template Variables

All templates use standardized variables that are replaced with actual values:

- `{{1}}`, `{{2}}`, `{{3}}`, etc.: Replaceable parameters in the message
- Standard variables include:
  - Customer names
  - Account types and numbers
  - Amounts and currencies
  - Dates and timestamps
  - Product IDs

## Implementation

### Registering Templates

To register all Arabic templates with WhatsApp Business API:

```bash
npm run register-arabic-templates
```

**Important Note About Access Tokens:** 
Meta access tokens have expiration times. If you encounter authentication errors like "Session has expired", you'll need to generate a new access token from the Meta Developers Portal:

1. Go to [Meta Developers Portal](https://developers.facebook.com/)
2. Navigate to your app
3. Go to WhatsApp Business API > Basic Setup
4. Generate a new permanent access token with the required permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
5. Update your `.env.local` file with the new token
6. Run the registration script again

This script reads the template configuration from `src/config/whatsapp-comprehensive-arabic-templates.json` and registers each template with the Meta API.

### Using Templates

To send template messages, use the template name along with the required parameters:

```typescript
// Example of sending an Arabic account opening notification
const templateMessage = {
  messaging_product: "whatsapp",
  to: phoneNumber,
  type: "template",
  template: {
    name: "arabic_account_opening",
    language: {
      code: "ar"
    },
    components: [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: "Ahmad Ali"  // Customer name
          },
          {
            type: "text", 
            text: "Current Account"  // Account type
          },
          {
            type: "text",
            text: "CA001"  // Product ID
          }
        ]
      }
    ]
  }
};
```

## Template Structure

Each template follows the WhatsApp Business API format:

```json
{
  "name": "template_identifier",
  "category": "ACCOUNT_UPDATE|PAYMENT_UPDATE|MARKETING",
  "language": "ar",
  "components": [
    {
      "type": "BODY",
      "text": "Arabic template text with {{variables}}",
      "example": {
        "body_text": [["value1", "value2", "value3"]]
      }
    }
  ]
}
```

## Best Practices

1. **Template Approval**: All templates must be approved by WhatsApp before use
2. **Variable Consistency**: Maintain consistent variable ordering across similar templates
3. **Localization**: Ensure all Arabic text is properly localized for the target region
4. **Testing**: Test templates with various parameter combinations before production use
5. **Compliance**: Follow WhatsApp's policies for business messaging

## Maintenance

- Regular review of template performance
- Updates to comply with WhatsApp policy changes
- Addition of new templates as business needs evolve
- Monitoring of template approval rates

## Integration Points

The Arabic templates integrate with:

- Customer onboarding workflows
- Transaction processing systems
- Account management services
- Marketing automation tools
- Customer support systems