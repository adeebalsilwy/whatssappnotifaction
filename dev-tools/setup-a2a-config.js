/**
 * Setup script for A2A Configuration
 * This script creates or updates the A2A configuration in the database
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Load environment variables
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');

function setupA2AConfig() {
  console.log('🔧 Setting up A2A Configuration...\n');
  
  try {
    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`📁 Created directory: ${dbDir}`);
    }
    
    // Connect to database
    const db = new Database(dbPath);
    console.log(`🗄️  Connected to database: ${dbPath}\n`);
    
    // Create settings table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    console.log('📋 A2A Configuration Values:');
    
    // A2A Server Configuration
    const a2aConfig = {
      host: process.env.A2A_HOST || 'A2A-SMS-CONNECTOR.mepspay.com',
      port: process.env.A2A_PORT || '9312',
      apiUrl: process.env.A2A_API_URL || '/wsGetMailsNotification/API/A2A/GetbankNotificationsList',
      srvID: process.env.A2A_SRV_ID || '1',
      userId: process.env.A2A_USER_ID || 'User',
      password: process.env.A2A_PASSWORD || '123',
      channel: process.env.A2A_CHANNEL || 'MW',
      bankCodeHeader: process.env.A2A_BANK_CODE_HEADER || 'A2A',
      bankCode: process.env.A2A_BANK_CODE || '1030200',
      sender: process.env.A2A_SENDER || 'FADBank',
      connectorID: process.env.A2A_CONNECTOR_ID || 'EN'
    };
    
    console.log('\n📡 A2A Server Configuration:');
    console.log(`   Host: ${a2aConfig.host}`);
    console.log(`   Port: ${a2aConfig.port}`);
    console.log(`   API URL: ${a2aConfig.apiUrl}`);
    console.log(`   SrvID: ${a2aConfig.srvID}`);
    console.log(`   UserID: ${a2aConfig.userId}`);
    console.log(`   Channel: ${a2aConfig.channel}`);
    console.log(`   Bank Code Header: ${a2aConfig.bankCodeHeader}`);
    console.log(`   Bank Code: ${a2aConfig.bankCode}`);
    console.log(`   Sender: ${a2aConfig.sender}`);
    
    // SMS Server Configuration (for fallback)
    const smsConfig = {
      host: process.env.A2A_SMS_HOST || '10.220.172.100',
      port: process.env.A2A_SMS_PORT || '7070',
      apiUrl: process.env.A2A_SMS_API_URL || '/API/Service/Interface/v3/SendSMS',
      username: process.env.A2A_SMS_USERNAME || 'Bank',
      password: process.env.A2A_SMS_PASSWORD || 'Bank@2024',
      userId: process.env.A2A_SMS_USER_ID || '124985'
    };
    
    console.log('\n📱 SMS Server Configuration (for fallback):');
    console.log(`   Host: ${smsConfig.host}`);
    console.log(`   Port: ${smsConfig.port}`);
    console.log(`   API URL: ${smsConfig.apiUrl}`);
    console.log(`   Username: ${smsConfig.username}`);
    console.log(`   UserID: ${smsConfig.userId}`);
    
    // Polling Configuration
    const pollingConfig = {
      enabled: process.env.A2A_ENABLE_POLLING === 'true',
      interval: process.env.A2A_POLLING_INTERVAL || '30000'
    };
    
    console.log('\n🔄 Polling Configuration:');
    console.log(`   Enabled: ${pollingConfig.enabled}`);
    console.log(`   Interval (ms): ${pollingConfig.interval}`);
    
    console.log('\n✅ A2A Configuration setup complete!');
    console.log('\n📝 To use A2A functionality:');
    console.log('   1. Make sure your .env.local file contains the A2A configuration');
    console.log('   2. Access the dashboard at /dashboard/a2a');
    console.log('   3. Use the API endpoints at /api/a2a');
    console.log('   4. Messages will be sent via WhatsApp automatically');
    
    db.close();
  } catch (error) {
    console.error('❌ Error setting up A2A configuration:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupA2AConfig();
}

module.exports = { setupA2AConfig };