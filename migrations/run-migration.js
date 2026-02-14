const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🚀 Running Database Migration...\n');

try {
    // Database path
    const dbPath = path.join(__dirname, '..', 'data', 'gateway.db');
    console.log(`🗄️  Connecting to database at: ${dbPath}`);
    
    // Initialize database
    const db = new Database(dbPath);
    
    // Enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON;');
    
    console.log('📋 Executing migration script...\n');
    
    // Read and execute migration file
    const migrationPath = path.join(__dirname, '001-create-users-tables.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split migration into individual statements
    const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let executedStatements = 0;
    
    for (const statement of statements) {
        try {
            db.exec(statement);
            executedStatements++;
            console.log(`✅ Executed statement ${executedStatements}`);
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('UNIQUE constraint')) {
                console.log(`ℹ️  Statement ${executedStatements + 1}: ${error.message}`);
            } else {
                console.log(`⚠️  Warning on statement ${executedStatements + 1}: ${error.message}`);
            }
            executedStatements++;
        }
    }
    
    console.log(`\n📊 Migration Results:`);
    console.log(`   Total statements processed: ${executedStatements}`);
    
    // Verify tables were created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'user_sessions', 'user_permissions', 'audit_log')").all();
    console.log(`   Tables created: ${tables.length}/4`);
    
    tables.forEach(table => {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        console.log(`   - ${table.name}: ${count.count} records`);
    });
    
    // Check default users
    const users = db.prepare("SELECT username, role, status, first_name, last_name FROM users ORDER BY id").all();
    console.log(`\n👥 Default Users Created:`);
    users.forEach(user => {
        console.log(`   - ${user.username} (${user.role}): ${user.first_name} ${user.last_name} - ${user.status}`);
    });
    
    // Close database
    db.close();
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n=== DEFAULT LOGIN CREDENTIALS ===');
    console.log('Admin:     username: admin     password: admin123');
    console.log('Manager:   username: manager   password: manager123');
    console.log('User:      username: user      password: user123');
    console.log('\n⚠️  Please change these default passwords after first login!');
    
} catch (error) {
    console.error('❌ Database migration failed:', error.message);
    process.exit(1);
}