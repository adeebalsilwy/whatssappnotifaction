import { WhatsAppNotificationService } from '../src/services/WhatsAppNotificationService';
import { VonageWhatsAppProvider } from '../src/providers/VonageWhatsAppProvider';

async function testArabicTemplates() {
  console.log('Testing Arabic WhatsApp Templates...');
  
  // Initialize the notification service
  const service = new WhatsAppNotificationService();
  
  // Test account opening notification
  console.log('\n1. Testing Account Opening Notification:');
  try {
    const accountResult = await service.sendAccountOpeningNotification(
      '967774577134', // Test recipient
      {
        customerId: '1006541',
        accountType: 'Current Accounts - Demand$ حسابات جارية / أفراد',
        productId: '200000069697'
      },
      'vonage' // Use Vonage provider
    );
    console.log('Account opening result:', accountResult);
  } catch (error) {
    console.error('Error sending account opening notification:', error);
  }
  
  // Test deposit notification
  console.log('\n2. Testing Deposit Notification:');
  try {
    const depositResult = await service.sendDepositNotification(
      '967774577134', // Test recipient
      {
        amount: '35,000.00',
        lastDigits: '********1097',
        date: '31 JUL 2025',
        currency: 'YER',
        balance: '40,419.94'
      },
      'vonage' // Use Vonage provider
    );
    console.log('Deposit notification result:', depositResult);
  } catch (error) {
    console.error('Error sending deposit notification:', error);
  }
  
  // Test withdrawal notification
  console.log('\n3. Testing Withdrawal Notification:');
  try {
    const withdrawalResult = await service.sendWithdrawalNotification(
      '967774577134', // Test recipient
      {
        amount: '1,700.00',
        lastDigits: '********1871',
        date: '31 JUL 2025',
        currency: 'YER',
        balance: '11,844,285.68'
      },
      'vonage' // Use Vonage provider
    );
    console.log('Withdrawal notification result:', withdrawalResult);
  } catch (error) {
    console.error('Error sending withdrawal notification:', error);
  }
  
  // Test getting all templates
  console.log('\n4. Listing all available templates:');
  try {
    const base = process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com';
    const response = await fetch(`${base.replace(/\/$/, '')}/api/whatsapp-templates`);
    const result = await response.json();
    if (result.success) {
      console.log('Available templates:', result.data);
    } else {
      console.error('Error fetching templates:', result.error);
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
  }
  
  console.log('\nArabic template testing completed!');
}

// Run the test
testArabicTemplates().catch(console.error);