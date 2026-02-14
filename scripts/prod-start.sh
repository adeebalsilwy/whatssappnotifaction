#!/bin/bash

# WhatsApp Gateway Production Startup Script
# Created for: firstaden-bank.com
# Version: 1.2 - Secure Environment Loading

echo "🚀 Starting WhatsApp Notification Gateway in Production Mode..."

# 1. Load Environment Variables from .env.production
if [ -f .env.production ]; then
    echo "Loading variables from .env.production..."
    export $(grep -v '^#' .env.production | xargs)
else
    echo "⚠️ .env.production not found! Please ensure your environment variables are set."
fi

# Ensure mandatory variables are present
if [ -z "$META_WHATSAPP_TOKEN" ]; then
    echo "❌ ERROR: META_WHATSAPP_TOKEN is missing. Please check your configuration."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install --production

echo "🏗️ Building the project..."
npm run build

echo "💾 Running database migrations/initialization..."
node scripts/migrate-templates.js

echo "🚀 Launching application..."
npm start
