#!/usr/bin/env node

/**
 * Production Startup Script for WhatsApp Notification Gateway
 * Ensures all configurations are set for production deployment
 */

// Load environment variables
require('dotenv').config();

console.log('🚀 Starting WhatsApp Notification Gateway in Production Mode...');
console.log('');

// Check for required environment variables
const requiredEnvVars = [
  'APINOTIFICATION_URL',
  'META_WHATSAPP_TOKEN',
  'META_WHATSAPP_NUMBER_ID',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_APP_SECRET'
];

console.log('🔍 Checking required environment variables...');
let missingEnvVars = [];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar);
  }
});

if (missingEnvVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`));
  console.log('');
  console.log('💡 Please set these variables in your .env.local file or environment');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}

// Show current configuration
console.log('');
console.log('📋 Current Configuration:');
console.log(`   API Notification URL: ${process.env.APINOTIFICATION_URL}`);
console.log(`   Default Provider: ${process.env.DEFAULT_PROVIDER || 'meta'}`);
console.log(`   Meta WhatsApp Number ID: ${process.env.META_WHATSAPP_NUMBER_ID}`);
console.log('');

// Provide startup instructions
console.log('📡 Webhook Configuration:');
console.log(`   - Webhook URL: ${process.env.APINOTIFICATION_URL}api/webhooks/meta`);
console.log('   - Verify Token: Use the value from META_WEBHOOK_VERIFY_TOKEN');
console.log('   - Subscribe to: messages, message_deliveries, message_reads');
console.log('');

console.log('✅ Environment is properly configured for production!');
console.log('');
console.log('🚀 To start the application, run:');
console.log('   npm run dev');
console.log('');
console.log('🔧 For production deployment:');
console.log('   npm run build && npm run start');
console.log('');