#!/bin/bash

# WhatsApp Gateway Production Startup Script
# Created for: firstaden-bank.com
# Version: 1.1 - Fully Configured

echo "🚀 Starting WhatsApp Notification Gateway in Production Mode..."

# 1. Export Environment Variables
export NODE_ENV=production
export PORT=3000

# Production API Notification URL
export APINOTIFICATION_URL=https://apinotification.firstaden-bank.com/

# Meta WhatsApp API Configuration (Production)
export META_WHATSAPP_API_URL=https://graph.facebook.com/v24.0
export META_WHATSAPP_NUMBER_ID=1398033981696517
export META_WHATSAPP_TOKEN=EAAJTmdOZCOoUBQojZCkxz6fPvRooTm5lF7gdkZC6x5cTuP5k2eyvcAxwo46i8sZCfvqavhGMrYZAZCZB1wk9DXBBf2ZAy9kRRFZCAEFZAOS5UoKxkvXXK6AV5KXj9VhJkbYAWOFzDqxBpJqVpyVrjsnXQpvo8E0MYCTR2Mdmn7JnX5XZAUuAPxD3t7ZA2aDevbhnBwZDZD
export META_WEBHOOK_VERIFY_TOKEN=774577
export WABA_ID=1129388509245250
export META_APP_SECRET=d124f7bc8fa8509c5456de90c5299cf4
export META_APP_KEY=654870101047941
export META_CUSTOMER_CODE=be6ef439ee64d73352fb45db8a95afb7

# Vonage Configuration
export VONAGE_API_URL=https://api.nexmo.com/v1/messages
export VONAGE_API_KEY=82f67722
export VONAGE_API_SECRET='J*nS4RbbSm$uDCg'
export VONAGE_APPLICATION_ID=f1657174-aeb0-40bf-95c1-4feed0af22e4
export VONAGE_FROM_NUMBER=12019404006

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
