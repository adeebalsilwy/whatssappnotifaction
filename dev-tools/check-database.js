const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'gateway.db'));

console.log('🔍 Database Analysis for Message Storage');

// Check all messages
const allMessages = db.prepare('SELECT * FROM messages ORDER BY createdAt DESC LIMIT 10').all();
console.log('\\n📊 All recent messages:');
allMessages.forEach((msg, index) => {
    console.log(index + 1 + '. To: ' + msg.to + ' | Status: ' + msg.status + ' | Created: ' + msg.createdAt);
});

// Check messages with provider IDs
const recentMessages = db.prepare('SELECT * FROM messages WHERE providerMessageId IS NOT NULL ORDER BY createdAt DESC LIMIT 5').all();
console.log('\\n📊 Messages with provider IDs:');
recentMessages.forEach((msg, index) => {
    console.log(index + 1 + '. Provider ID: ' + msg.providerMessageId + ' | Status: ' + msg.status);
});

// Check for messages to our specific number
const targetMessages = db.prepare('SELECT * FROM messages WHERE [to] = ? ORDER BY createdAt DESC').all('+967774577134');
console.log('\\n📊 Messages to +967774577134:');
if (targetMessages.length > 0) {
    targetMessages.forEach((msg, index) => {
        console.log(index + 1 + '. DB ID: ' + msg.id + ' | Status: ' + msg.status + ' | Provider ID: ' + msg.providerMessageId);
    });
} else {
    console.log('No messages found for this number in database');
}

db.close();