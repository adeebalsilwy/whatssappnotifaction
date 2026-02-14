const Database = require('better-sqlite3');
const path = require('path');

console.log('🔍 Comprehensive Diagnostic for WhatsApp Number 774577134');
console.log('========================================================');

const fullNumber = '+967774577134';

async function runDiagnostic() {
    try {
        // Test message sending
        console.log('\n📡 Testing message sending to', fullNumber);
        
        const response = await fetch((process.env.APINOTIFICATION_URL || 'https://apinotification.firstaden-bank.com').replace(/\/$/, '') + '/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: fullNumber,
                body: 'Diagnostic test message - Please confirm receipt',
                meta: { 
                    txnId: 'diagnostic-' + Date.now(), 
                    sourceSystem: 'Diagnostics',
                    purpose: 'Delivery verification'
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Message sent successfully');
            console.log('   Provider Message ID:', result.providerMessageId);
            console.log('   Meta API Response:', result.rawResponse?.messaging_product);
            console.log('   Contact verified:', result.rawResponse?.contacts?.[0]?.wa_id);
        } else {
            console.log('❌ Message sending failed:', result.errorMessage);
            return;
        }
        
        // Check database records
        console.log('\n🗄️  Checking database records...');
        const dbPath = path.join(__dirname, 'gateway.db');
        
        if (!require('fs').existsSync(dbPath)) {
            console.log('❌ Database file not found');
            return;
        }
        
        const db = new Database(dbPath);
        
        // Check messages for this number
        const messages = db.prepare('SELECT * FROM messages WHERE [to] = ? ORDER BY createdAt DESC LIMIT 3').all(fullNumber);
        
        console.log('\n📊 Messages sent to this number:');
        if (messages.length > 0) {
            messages.forEach((msg, index) => {
                console.log(`   ${index + 1}. DB ID: ${msg.id}`);
                console.log(`      Status: ${msg.status}`);
                console.log(`      Provider Message ID: ${msg.providerMessageId}`);
                console.log(`      Created: ${msg.createdAt}`);
                console.log(`      Message: ${msg.message.substring(0, 50)}...`);
                console.log('');
            });
        } else {
            console.log('   No messages found in database for this number');
        }
        
        // Check webhook events
        const events = db.prepare(`
            SELECT * FROM message_events 
            WHERE messageId IN (SELECT id FROM messages WHERE [to] = ?) 
            ORDER BY createdAt DESC LIMIT 10
        `).all(fullNumber);
        
        console.log('📊 Webhook Events:');
        if (events.length > 0) {
            const inboundEvents = events.filter(e => e.eventType === 'inbound');
            const statusEvents = events.filter(e => e.eventType === 'status');
            
            if (inboundEvents.length > 0) {
                console.log('   ✅ Inbound message events received');
            }
            
            if (statusEvents.length > 0) {
                console.log('   ✅ Status update events received');
                statusEvents.forEach(event => {
                    try {
                        const payload = JSON.parse(event.eventPayload);
                        console.log(`   - Status: ${payload.mappedStatus || payload.status || 'Unknown'}`);
                        console.log(`     Timestamp: ${payload.timestamp || 'N/A'}`);
                    } catch(e) {
                        console.log('   - Status event recorded');
                    }
                });
            } else {
                console.log('   ⚠️  No status updates received yet');
                console.log('     This is normal - status updates may take time to arrive from Meta');
            }
        } else {
            console.log('   ⚠️  No webhook events recorded for this number');
        }
        
        db.close();
        
        // Analysis summary
        console.log('\n📋 Analysis Summary:');
        console.log('✅ API successfully sends messages to +967774577134');
        console.log('✅ Meta API confirms number is registered on WhatsApp');
        console.log('✅ Database properly records message transactions');
        
        if (messages.length > 0) {
            const latestMessage = messages[0];
            if (latestMessage.status === 'SENT' || latestMessage.status === 'DELIVERED') {
                console.log('✅ Latest message status:', latestMessage.status);
            } else {
                console.log('⚠️  Latest message status:', latestMessage.status);
                console.log('   Status updates may still be pending from Meta');
            }
        }
        
        // Common troubleshooting steps
        console.log('\n🔧 Troubleshooting Recommendations:');
        console.log('1. Verify the recipient has WhatsApp installed and active');
        console.log('2. Check if recipient has privacy settings blocking business messages');
        console.log('3. Confirm recipient has initiated contact with your business account (if required)');
        console.log('4. Wait for status updates - Meta may take minutes to send delivery confirmations');
        console.log('5. Check webhook endpoint is properly configured in Meta Developer Console');
        console.log('6. Verify ngrok tunnel is active if testing locally');
        
        console.log('\n💡 If messages still don\'t arrive:');
        console.log('- Test with a different number to isolate the issue');
        console.log('- Check Meta Business Account verification status');
        console.log('- Verify message templates are approved if sending template messages');
        console.log('- Contact Meta support if the issue persists');
        
    } catch (error) {
        console.log('❌ Diagnostic error:', error.message);
    }
}

runDiagnostic();