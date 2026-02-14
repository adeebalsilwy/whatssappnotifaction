const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'gateway.db');

console.log('🔧 Initializing database for SMS fallback system...');

try {
  const db = new Database(dbPath);
  
  // Create table for tracking failed messages and fallback attempts
  db.exec(`
    CREATE TABLE IF NOT EXISTS failed_message_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      originalMessageId INTEGER NOT NULL,
      originalProvider TEXT NOT NULL,
      originalErrorCode TEXT,
      originalErrorMessage TEXT,
      fallbackProvider TEXT NOT NULL,
      fallbackTransactionId TEXT UNIQUE,
      fallbackStatus TEXT NOT NULL, -- 'ATTEMPTED', 'SUCCESS', 'FAILED'
      fallbackErrorCode TEXT,
      fallbackErrorMessage TEXT,
      phoneNumber TEXT NOT NULL,
      messageContent TEXT NOT NULL,
      attemptTimestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      completionTimestamp TEXT,
      FOREIGN KEY (originalMessageId) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);
  
  // Add indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_failed_attempts_phone 
    ON failed_message_attempts (phoneNumber)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_failed_attempts_timestamp 
    ON failed_message_attempts (attemptTimestamp)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_failed_attempts_original 
    ON failed_message_attempts (originalMessageId)
  `);
  
  // Add column to messages table to track if it was a fallback delivery
  try {
    db.exec(`
      ALTER TABLE messages ADD COLUMN isFallback BOOLEAN DEFAULT FALSE
    `);
  } catch (e) {
    // Column might already exist
    console.log('ℹ️  Messages table already has isFallback column');
  }
  
  // Add column to track original provider for fallback messages
  try {
    db.exec(`
      ALTER TABLE messages ADD COLUMN originalProvider TEXT
    `);
  } catch (e) {
    // Column might already exist
    console.log('ℹ️  Messages table already has originalProvider column');
  }
  
  // Add column to track transaction ID for SMS deliveries
  try {
    db.exec(`
      ALTER TABLE messages ADD COLUMN transactionId TEXT
    `);
  } catch (e) {
    // Column might already exist
    console.log('ℹ️  Messages table already has transactionId column');
  }
  
  console.log('✅ Database initialized successfully');
  
  // Show table structure
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('failed_message_attempts', 'messages')
  `).all();
  
  console.log('\n📋 Created/Updated tables:');
  tables.forEach((table) => {
    console.log(`- ${table.name}`);
    
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`  Columns: ${columns.map((col) => col.name).join(', ')}`);
  });
  
  db.close();
  
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}