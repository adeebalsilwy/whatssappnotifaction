#!/bin/bash

# WhatsApp Gateway Production Startup Script
# Created for: firstaden-bank.com

echo "🚀 Starting WhatsApp Notification Gateway in Production Mode..."

# 1. Export Environment Variables
export NODE_ENV=production
export PORT=3000

# Production API Notification URL
export APINOTIFICATION_URL=https://apinotification.firstaden-bank.com/

# Meta WhatsApp API Configuration
export META_WHATSAPP_API_URL=https://graph.facebook.com/v24.0
export META_WHATSAPP_NUMBER_ID="YOUR_NUMBER_ID"
export META_WHATSAPP_TOKEN="YOUR_PERMANENT_TOKEN"
export META_WEBHOOK_VERIFY_TOKEN="774577"
export WABA_ID="YOUR_WABA_ID"
export META_APP_SECRET="YOUR_APP_SECRET"

# Vonage Configuration
export VONAGE_API_URL=https://api.nexmo.com/v1/messages
export VONAGE_API_KEY="YOUR_VONAGE_KEY"
export VONAGE_API_SECRET="YOUR_VONAGE_SECRET"
export VONAGE_APPLICATION_ID="YOUR_APP_ID"
export VONAGE_FROM_NUMBER="12019404006"

# Generic Provider Configuration
export GENERIC_WHATSAPP_URL=http://localhost:3000/api/mock/generic
export GENERIC_WHATSAPP_TOKEN=your-generic-provider-token

# Direct Provider Configuration
export DIRECT_WHATSAPP_URL=http://localhost:3001/api/whatsapp/send
export DIRECT_WHATSAPP_TOKEN=test-token
export DIRECT_WHATSAPP_FROM=+967774577134

# FAD SMS Provider Configuration
export FAD_SMS_URL=http://10.220.172.100:7070/API/Service/Interface/v3/SendSMS
export FAD_SMS_USERNAME=Bank
export FAD_SMS_PASSWORD=1234567890

# Default Provider
export DEFAULT_PROVIDER=meta

# Database Configuration
export SQLITE_DB_PATH=./data/gateway.db
export DATABASE_URL=file:./data/gateway.db

# WhatsApp Template Registration Variables
export WHATSAPP_ACCESS_TOKEN=$META_WHATSAPP_TOKEN

echo "📦 Installing dependencies..."
npm install --production

echo "🏗️ Building the project..."
npm run build

echo "💾 Running database migrations/initialization..."
node scripts/migrate-templates.js

echo "🚀 Launching application..."
npm start
