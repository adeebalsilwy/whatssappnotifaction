#!/usr/bin/env node

/**
 * Professional Meta WhatsApp Webhook Setup Script
 * Automates database initialization and webhook configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Meta WhatsApp Webhook Professional Setup...\n');

// Configuration constants
const CONFIG = {
    DB_PATH: './gateway.db',
    ENV_FILE: '.env.local',
    WEBHOOK_ENDPOINT: '/api/webhooks/meta',
    REQUIRED_ENV_VARS: [
        'META_WHATSAPP_API_URL',
        'META_WHATSAPP_NUMBER_ID', 
        'META_WHATSAPP_TOKEN',
        'META_WEBHOOK_VERIFY_TOKEN',
        'META_APP_SECRET' // Required to enable X-Hub-Signature-256 verification
    ]
};

/**
 * Check if required environment variables are present
 */
function checkEnvironment() {
    console.log('🔍 Checking environment configuration...');
    
    if (!fs.existsSync(CONFIG.ENV_FILE)) {
        throw new Error(`Environment file ${CONFIG.ENV_FILE} not found`);
    }

    const envContent = fs.readFileSync(CONFIG.ENV_FILE, 'utf8');
    const missingVars = [];

    CONFIG.REQUIRED_ENV_VARS.forEach(varName => {
        if (!envContent.includes(varName)) {
            missingVars.push(varName);
        }
    });

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Environment configuration verified\n');
    return true;
}

/**
 * Initialize SQLite database
 */
async function initializeDatabase() {
    console.log('🗄️  Initializing SQLite database...');
    
    try {
        // Import and run database initialization
        const { DatabaseService } = require(path.join(__dirname, 'src', 'gateway', 'storage', 'sqlite', 'db'));
        
        const db = await DatabaseService.getInstance();
        console.log(`✅ Database initialized at ${CONFIG.DB_PATH}`);
        
        // Verify tables exist
        const tables = await db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN (
                'settings', 'providers', 'messages', 'message_events', 
                'api_logs', 'provider_priority', 'message_templates'
            )
        `);
        
        console.log(`📋 Created tables: ${tables.map(t => t.name).join(', ')}`);
        
        return db;
    } catch (error) {
        throw new Error(`Database initialization failed: ${error.message}`);
    }
}

/**
 * Validate webhook endpoints
 */
function validateWebhookEndpoints() {
    console.log('🔌 Validating webhook endpoints...');
    
    const endpoints = [
        '/api/webhooks/meta',
        '/api/webhooks/meta/inbound', 
        '/api/webhooks/meta/status'
    ];

    // Check if route files exist
    endpoints.forEach(endpoint => {
        const filePath = path.join(
            __dirname, 
            'src', 
            'app', 
            endpoint.replace('/api/', '').replace(/\//g, path.sep),
            'route.ts'
        );
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Webhook route file not found: ${filePath}`);
        }
    });

    console.log('✅ All webhook endpoints validated\n');
}

/**
 * Test webhook verification
 */
async function testWebhookVerification(port = 9002) {
    console.log('🧪 Testing webhook verification...');
    
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || '774577';
    const testChallenge = '123456';
    
    try {
        // This would normally be tested against the running server
        console.log(`📝 Manual verification test:`);
        const base = (process.env.APINOTIFICATION_URL || `http://localhost:${port}`).replace(/\/$/, '');
        console.log(`   URL: ${base}${CONFIG.WEBHOOK_ENDPOINT}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${testChallenge}`);
        console.log(`   Expected response: ${testChallenge}\n`);
        
        return true;
    } catch (error) {
        throw new Error(`Webhook verification test failed: ${error.message}`);
    }
}

/**
 * Generate webhook configuration report
 */
function generateConfigurationReport(dbPath) {
    console.log('📋 Generating configuration report...\n');
    
    const report = {
        timestamp: new Date().toISOString(),
        database: {
            path: dbPath,
            status: 'initialized'
        },
        environment: {
            file: CONFIG.ENV_FILE,
            variables: CONFIG.REQUIRED_ENV_VARS
        },
        webhooks: {
            mainEndpoint: CONFIG.WEBHOOK_ENDPOINT,
            inboundEndpoint: '/api/webhooks/meta/inbound',
            statusEndpoint: '/api/webhooks/meta/status'
        },
        nextSteps: [
            '1. Start the development server: npm run dev',
            '2. Expose with ngrok: ngrok http 9002',
            '3. Configure Meta Developer Console with ngrok URL',
            '4. Test webhook verification with the generated URL',
            '5. Send test messages to verify integration'
        ]
    };

    const reportPath = './META_WHATSAPP_SETUP_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Configuration report saved to: ${reportPath}\n`);
    
    return report;
}

/**
 * Display setup completion message
 */
function displayCompletion(report) {
    console.log('🎉 Setup Complete!\n');
    console.log('=== NEXT STEPS ===');
    report.nextSteps.forEach(step => console.log(step));
    console.log('');
    console.log('=== QUICK TEST COMMANDS ===');
    console.log('Start server: npm run dev');
        console.log('Test send: curl -X POST https://apinotification.firstaden-bank.com/api/whatsapp/send -H "Content-Type: application/json" -d \'{"to":"+967774577134","body":"Test message","meta":{"txnId":"test-123"}}\'');
    console.log('');
}

/**
 * Main setup function
 */
async function runSetup() {
    try {
        // Load environment variables
        require('dotenv').config({ path: CONFIG.ENV_FILE });
        
        // Execute setup steps
        checkEnvironment();
        await initializeDatabase();
        validateWebhookEndpoints();
        await testWebhookVerification();
        const report = generateConfigurationReport(CONFIG.DB_PATH);
        
        displayCompletion(report);
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup if script is executed directly
if (require.main === module) {
    runSetup();
}

module.exports = { runSetup, checkEnvironment, initializeDatabase };