const Database = require('better-sqlite3');
const path = require('path');

console.log('🚀 Creating User Management Tables...\n');

try {
    // Database path
    const dbPath = path.join(__dirname, '..', 'data', 'gateway.db');
    console.log(`🗄️  Connecting to database at: ${dbPath}`);
    
    // Initialize database
    const db = new Database(dbPath);
    
    // Enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON;');
    
    console.log('📋 Creating tables...\n');
    
    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT UNIQUE,
            role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user')),
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'locked')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            department TEXT,
            position TEXT
        )
    `);
    console.log('✅ Created users table');
    
    // Create user_sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Created user_sessions table');
    
    // Create user_permissions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            permission_key TEXT NOT NULL,
            granted BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            granted_by INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (granted_by) REFERENCES users(id),
            UNIQUE(user_id, permission_key)
        )
    `);
    console.log('✅ Created user_permissions table');
    
    // Create audit_log table
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    console.log('✅ Created audit_log table');
    
    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON user_permissions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at)');
    console.log('✅ Created indexes');
    
    // Create triggers
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
            UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END
    `);
    console.log('✅ Created triggers');
    
    // Insert default users with proper bcrypt hashes
    const bcrypt = require('bcryptjs');
    
    // Hash passwords
    const adminHash = bcrypt.hashSync('admin123', 10);
    const managerHash = bcrypt.hashSync('manager123', 10);
    const userHash = bcrypt.hashSync('user123', 10);
    
    // Insert admin user
    const adminStmt = db.prepare(`
        INSERT OR IGNORE INTO users (username, password_hash, email, role, status, first_name, last_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    adminStmt.run('admin', adminHash, 'admin@example.com', 'admin', 'active', 'مدير', 'النظام');
    console.log('✅ Created default admin user');
    
    // Insert manager user
    const managerStmt = db.prepare(`
        INSERT OR IGNORE INTO users (username, password_hash, email, role, status, first_name, last_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    managerStmt.run('manager', managerHash, 'manager@example.com', 'manager', 'active', 'مدير', 'القسم');
    console.log('✅ Created default manager user');
    
    // Insert regular user
    const userStmt = db.prepare(`
        INSERT OR IGNORE INTO users (username, password_hash, email, role, status, first_name, last_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    userStmt.run('user', userHash, 'user@example.com', 'user', 'active', 'مستخدم', 'عادي');
    console.log('✅ Created default regular user');
    
    // Insert permissions
    const permStmt = db.prepare(`
        INSERT OR IGNORE INTO user_permissions (user_id, permission_key, granted) 
        VALUES (?, ?, ?)
    `);
    
    // Get user IDs
    const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    const managerUser = db.prepare('SELECT id FROM users WHERE username = ?').get('manager');
    const regularUser = db.prepare('SELECT id FROM users WHERE username = ?').get('user');
    
    if (adminUser) {
        permStmt.run(adminUser.id, 'manage_users', 1);
        permStmt.run(adminUser.id, 'manage_settings', 1);
        permStmt.run(adminUser.id, 'view_reports', 1);
        permStmt.run(adminUser.id, 'send_messages', 1);
        console.log('✅ Set admin permissions');
    }
    
    if (managerUser) {
        permStmt.run(managerUser.id, 'view_reports', 1);
        permStmt.run(managerUser.id, 'send_messages', 1);
        permStmt.run(managerUser.id, 'manage_templates', 1);
        console.log('✅ Set manager permissions');
    }
    
    if (regularUser) {
        permStmt.run(regularUser.id, 'view_reports', 1);
        permStmt.run(regularUser.id, 'send_messages', 1);
        console.log('✅ Set user permissions');
    }
    
    // Add audit log entry
    const auditStmt = db.prepare(`
        INSERT INTO audit_log (user_id, action, resource_type, details) 
        VALUES (?, ?, ?, ?)
    `);
    if (adminUser) {
        auditStmt.run(adminUser.id, 'SYSTEM_INIT', 'USERS', 'Created default users and permissions');
        console.log('✅ Added audit log entry');
    }
    
    // Verify results
    console.log('\n📊 Verification Results:');
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`   Users: ${userCount.count}`);
    
    const tableCount = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name IN ('users', 'user_sessions', 'user_permissions', 'audit_log')
    `).get();
    console.log(`   Tables: ${tableCount.count}/4`);
    
    const users = db.prepare('SELECT username, role, first_name, last_name FROM users ORDER BY id').all();
    console.log('\n👥 Created Users:');
    users.forEach(user => {
        console.log(`   - ${user.username} (${user.role}): ${user.first_name} ${user.last_name}`);
    });
    
    // Close database
    db.close();
    
    console.log('\n🎉 User management tables created successfully!');
    console.log('\n=== DEFAULT LOGIN CREDENTIALS ===');
    console.log('Admin:     username: admin     password: admin123');
    console.log('Manager:   username: manager   password: manager123');
    console.log('User:      username: user      password: user123');
    console.log('\n⚠️  Please change these default passwords after first login!');
    
} catch (error) {
    console.error('❌ Failed to create user management tables:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
        console.log('\n💡 Please install bcryptjs: npm install bcryptjs');
    }
    process.exit(1);
}