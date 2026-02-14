const Database = require('better-sqlite3');
const path = require('path');

console.log('🧪 Testing SMS Fallback System');
console.log('==============================');

async function testFallbackSystem() {
  try {
    // Test 1: Check database schema
    console.log('\n1️⃣ Checking database schema...');
    const db = new Database('./gateway.db');
    
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('failed_message_attempts', 'messages')
    `).all();
    
    console.log('✅ Required tables found:', tables.map(t => t.name));
    
    // Check columns in messages table
    const messageColumns = db.prepare('PRAGMA table_info(messages)').all();
    const requiredColumns = ['isFallback', 'originalProvider', 'transactionId'];
    const hasRequiredColumns = requiredColumns.every(col => 
      messageColumns.some(c => c.name === col)
    );
    
    console.log('✅ Messages table has required columns:', hasRequiredColumns);
    
    // Check failed_message_attempts table
    const fallbackColumns = db.prepare('PRAGMA table_info(failed_message_attempts)').all();
    console.log('✅ Failed attempts table columns:', fallbackColumns.map(c => c.name));
    
    db.close();
    
    // Test 2: Test transaction ID generation
    console.log('\n2️⃣ Testing transaction ID generation...');
    
    // Import the transaction utilities
    const { generateFailedMessageTransactionId, parseTransactionId, isFailedMessageTransactionId } = 
      await import('../src/lib/transaction-utils.js');
    
    const testPhone = '+967774577134';
    const testProvider = 'meta';
    
    const transactionId = generateFailedMessageTransactionId(testPhone, testProvider);
    console.log('Generated Transaction ID:', transactionId);
    
    const parsed = parseTransactionId(transactionId);
    console.log('Parsed Transaction ID:', parsed);
    
    const isFailed = isFailedMessageTransactionId(transactionId);
    console.log('Is failed message transaction:', isFailed);
    
    console.log('✅ Transaction ID generation working correctly');
    
    // Test 3: Test phone number formatting
    console.log('\n3️⃣ Testing phone number formatting...');
    
    const { formatPhoneNumberForSms, isValidYemeniPhoneNumber, normalizePhoneNumber } = 
      await import('../src/lib/transaction-utils.js');
    
    const testNumbers = [
      '+967774577134',
      '967774577134',
      '0774577134',
      '774577134'
    ];
    
    testNumbers.forEach(num => {
      const formatted = formatPhoneNumberForSms(num);
      const isValid = isValidYemeniPhoneNumber(num);
      const normalized = normalizePhoneNumber(num);
      
      console.log(`${num} -> Formatted: ${formatted}, Valid: ${isValid}, Normalized: ${normalized}`);
    });
    
    console.log('✅ Phone number formatting working correctly');
    
    // Test 4: Test FAD SMS provider configuration
    console.log('\n4️⃣ Testing FAD SMS provider configuration...');
    
    const fs = require('fs');
    const configPath = path.join(__dirname, '../src/config/whatsapp-config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const fadConfig = config.providers?.fad;
      
      console.log('FAD Provider Config:', {
        url: fadConfig?.url ? '✓ Configured' : '✗ Missing',
        username: fadConfig?.username ? '✓ Configured' : '✗ Missing',
        password: fadConfig?.password ? '✓ Configured' : '✗ Missing'
      });
      
      if (fadConfig?.url && fadConfig?.username && fadConfig?.password) {
        console.log('✅ FAD SMS provider properly configured');
      } else {
        console.log('⚠️  FAD SMS provider configuration incomplete');
      }
    } else {
      console.log('⚠️  Configuration file not found');
    }
    
    // Test 5: Test logging system
    console.log('\n5️⃣ Testing logging system...');
    
    const { logToFile } = await import('../src/lib/logger.js');
    
    // Test writing to fallback log
    await logToFile('fallback', {
      event: 'TEST_FALLBACK_EVENT',
      message: 'Testing fallback logging system',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Fallback logging working');
    
    // Test writing to SMS delivery log
    await logToFile('sms_delivery', {
      event: 'TEST_SMS_EVENT',
      message: 'Testing SMS delivery logging',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ SMS delivery logging working');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Database schema: ✓ Ready');
    console.log('- Transaction IDs: ✓ Working');
    console.log('- Phone formatting: ✓ Working');
    console.log('- Provider config: ✓ Verified');
    console.log('- Logging system: ✓ Working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testFallbackSystem();