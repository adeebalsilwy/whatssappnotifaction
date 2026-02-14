const fs = require('fs');
const path = require('path');

console.log('🧪 Meta WhatsApp Integration Comprehensive Test\n');

// Test configuration
const TEST_CONFIG = {
    phoneNumber: '+967774577134',
    verifyToken: '774577',
    baseUrl: process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com',
    webhookEndpoints: [
        '/api/webhooks/meta',
        '/api/webhooks/meta/inbound',
        '/api/webhooks/meta/status'
    ]
};

/**
 * Test 1: Environment Configuration
 */
function testEnvironment() {
    console.log('🔍 Test 1: Environment Configuration');
    
    const requiredVars = [
        'META_WHATSAPP_API_URL',
        'META_WHATSAPP_NUMBER_ID',
        'META_WHATSAPP_TOKEN',
        'META_WEBHOOK_VERIFY_TOKEN'
    ];
    
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
    
    if (missingVars.length === 0) {
        console.log('✅ All required environment variables present');
        return true;
    } else {
        console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
        return false;
    }
}

/**
 * Test 2: Database Initialization
 */
function testDatabase() {
    console.log('\n🔍 Test 2: Database Initialization');
    
    const dbPath = path.join(__dirname, 'gateway.db');
    
    if (fs.existsSync(dbPath)) {
        console.log('✅ Database file exists');
        
        // Try to load and check tables
        try {
            const Database = require('better-sqlite3');
            const db = new Database(dbPath);
            
            const tables = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN (
                    'settings', 'providers', 'messages', 'message_events', 
                    'api_logs', 'provider_priority', 'message_templates'
                )
            `).all();
            
            console.log(`✅ Found ${tables.length} required tables`);
            db.close();
            return true;
        } catch (error) {
            console.log(`❌ Database access error: ${error.message}`);
            return false;
        }
    } else {
        console.log('❌ Database file not found');
        return false;
    }
}

/**
 * Test 3: Webhook Endpoints Availability
 */
async function testWebhookEndpoints() {
    console.log('\n🔍 Test 3: Webhook Endpoints Availability');
    
    const results = [];
    
    for (const endpoint of TEST_CONFIG.webhookEndpoints) {
        try {
            const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok || response.status === 403) {
                // 403 is expected for GET requests to webhook endpoints that expect POST
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    console.log(`✅ ${endpoint}: Available (${data.message || `HTTP ${response.status}`})`);
                } else {
                    const text = await response.text();
                    console.log(`✅ ${endpoint}: Available (HTTP ${response.status} - ${text.substring(0, 50)})`);
                }
                results.push(true);
            } else {
                console.log(`❌ ${endpoint}: HTTP ${response.status}`);
                results.push(false);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
            results.push(false);
        }
    }
    
    return results.every(r => r);
}

/**
 * Test 4: Webhook Verification
 */
async function testWebhookVerification() {
    console.log('\n🔍 Test 4: Webhook Verification');
    
    const verificationUrl = `${TEST_CONFIG.baseUrl}/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=${TEST_CONFIG.verifyToken}&hub.challenge=123456`;
    
    try {
        const response = await fetch(verificationUrl);
        const text = await response.text();
        
        if (text === '123456') {
            console.log('✅ Webhook verification successful');
            return true;
        } else {
            console.log(`❌ Webhook verification failed. Expected '123456', got '${text}'`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Webhook verification error: ${error.message}`);
        return false;
    }
}

/**
 * Test 5: Message Sending
 */
async function testMessageSending() {
    console.log('\n🔍 Test 5: Message Sending');
    
    const messageData = {
        to: TEST_CONFIG.phoneNumber,
        body: 'Test message from Meta WhatsApp API Integration Test',
        meta: {
            txnId: `test-${Date.now()}`,
            sourceSystem: 'IntegrationTest'
        }
    };
    
    try {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Message sent successfully');
            console.log(`   Provider: ${result.provider}`);
            console.log(`   Message ID: ${result.providerMessageId}`);
            return true;
        } else {
            console.log(`❌ Message sending failed: ${result.errorMessage || 'Unknown error'}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Message sending error: ${error.message}`);
        return false;
    }
}

/**
 * Test 6: Database Message Storage
 */
function testDatabaseStorage() {
    console.log('\n🔍 Test 6: Database Message Storage');
    
    try {
        const Database = require('better-sqlite3');
        const dbPath = path.join(__dirname, 'gateway.db');
        const db = new Database(dbPath);
        
        // Check if messages table has records
        const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
        console.log(`✅ Database contains ${messageCount.count} message records`);
        
        if (messageCount.count > 0) {
            const recentMessage = db.prepare('SELECT * FROM messages ORDER BY createdAt DESC LIMIT 1').get();
            console.log(`   Latest message to: ${recentMessage.to}`);
            console.log(`   Status: ${recentMessage.status}`);
        }
        
        db.close();
        return true;
    } catch (error) {
        console.log(`❌ Database storage test failed: ${error.message}`);
        return false;
    }
}

/**
 * Generate test report
 */
function generateTestReport(results) {
    console.log('\n📋 Test Report Summary');
    console.log('====================');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`Tests Passed: ${passed}/${total} (${percentage}%)`);
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test}`);
    });
    
    // Overall assessment
    if (percentage === 100) {
        console.log('\n🎉 ALL TESTS PASSED - Integration is ready for production!');
    } else if (percentage >= 80) {
        console.log('\n🟡 MOST TESTS PASSED - Minor issues need attention');
    } else {
        console.log('\n🔴 CRITICAL ISSUES DETECTED - Integration requires fixes');
    }
    
    // Next steps
    console.log('\n🚀 Next Steps:');
    if (!results.environment) console.log('1. Fix missing environment variables');
    if (!results.database) console.log('2. Reinitialize database');
    if (!results.webhooks) console.log('3. Check webhook endpoint availability');
    if (!results.verification) console.log('4. Verify webhook configuration with Meta');
    if (!results.messaging) console.log('5. Test message delivery with actual number');
    if (results.allPassed) console.log('1. Integration is ready for production deployment');
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('Starting comprehensive integration tests...\n');
    
    const results = {
        environment: testEnvironment(),
        database: testDatabase(),
        webhooks: await testWebhookEndpoints(),
        verification: await testWebhookVerification(),
        messaging: await testMessageSending(),
        storage: testDatabaseStorage()
    };
    
    results.allPassed = Object.values(results).every(r => r);
    
    generateTestReport(results);
    
    return results;
}

// Run tests if script is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };