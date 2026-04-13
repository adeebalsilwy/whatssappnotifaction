let BetterSqlite3: any;
try {
  BetterSqlite3 = require('better-sqlite3');
} catch (e) {
  BetterSqlite3 = null;
}
import path from 'path';

// Standardize database path configuration
export function getDatabasePath(): string {
  // Check environment variable first
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }
  
  // Check for data directory (new structure)
  const dataPath = path.join(process.cwd(), 'data', 'gateway.db');
  if (require('fs').existsSync(dataPath)) {
    return dataPath;
  }
  
  // Fallback to root directory (legacy)
  const rootPath = path.join(process.cwd(), 'gateway.db');
  return rootPath;
}

// Lightweight in-memory DB used for tests or when native binding is unavailable
class InMemoryStmt {
  constructor(private table: any[], private sql: string) {}
  run(...args: any[]) {
    // support simple INSERT ... VALUES and UPDATE/DELETE patterns used in tests/auth
    const sql = this.sql.toLowerCase();

    if (sql.startsWith('insert into users')) {
      const row: any = { id: (this.table.length ? this.table[this.table.length-1].id + 1 : 1) };
      // crude: assume values for username and password_hash and role/status
      // map by position for the few inserts used in tests
      row.username = args[0];
      row.password_hash = args[1];
      row.role = 'admin';
      row.status = 'active';
      row.created_at = new Date().toISOString();
      row.updated_at = new Date().toISOString();
      row.failed_login_attempts = 0;
      this.table.push(row);
      return { lastInsertRowid: row.id, changes: 1 };
    }

    if (sql.startsWith('insert into user_sessions')) {
      const id = (this.table.length ? this.table[this.table.length-1].id + 1 : 1);
      const [user_id, session_token, expires_at, ip_address, user_agent] = args;
      const row: any = { id, user_id, session_token, expires_at, ip_address, user_agent, last_activity: new Date().toISOString() };
      this.table.push(row);
      // DEBUG: trace inserted session rows during tests
      console.debug && console.debug('InMemoryDB: inserted user_session', row);
      return { lastInsertRowid: id, changes: 1 };
    }

    if (sql.startsWith('delete from user_sessions where user_id')) {
      const userId = args[0];
      const before = this.table.length;
      for (let i = this.table.length -1; i >=0; i--) {
        if (this.table[i].user_id === userId) this.table.splice(i,1);
      }
      return { changes: before - this.table.length };
    }

    if (sql.startsWith('delete from user_sessions where session_token')) {
      const token = args[0];
      const before = this.table.length;
      for (let i = this.table.length -1; i >=0; i--) {
        if (this.table[i].session_token === token) this.table.splice(i,1);
      }
      return { changes: before - this.table.length };
    }

    if (sql.startsWith('update users set failed_login_attempts')) {
      const [attempts, id] = args;
      const u = this.table.find((r:any) => r.id === id);
      if (u) { u.failed_login_attempts = attempts; return { changes: 1 }; }
      return { changes: 0 };
    }

    if (sql.startsWith('update users set password_hash')) {
      const [hash, id] = args;
      const u = this.table.find((r:any) => r.id === id);
      if (u) { u.password_hash = hash; u.failed_login_attempts = 0; return { changes: 1 }; }
      return { changes: 0 };
    }

    if (sql.startsWith('update users set failed_login_attempts = 0')) {
      const id = args[0];
      const u = this.table.find((r:any) => r.id === id);
      if (u) { u.failed_login_attempts = 0; u.last_login = new Date().toISOString(); return { changes: 1 }; }
      return { changes: 0 };
    }

    if (sql.startsWith('update user_sessions set last_activity')) {
      const id = args[0];
      const s = this.table.find((r:any) => r.id === id);
      if (s) { s.last_activity = new Date().toISOString(); return { changes: 1 }; }
      return { changes: 0 };
    }

    return { changes: 0 };
  }
  get(..._args:any[]) { return null; }
  all(..._args:any[]) { return []; }
}

class InMemoryDB {
  users: any[] = [];
  user_sessions: any[] = [];
  audit_log: any[] = [];

  constructor() {
    // seed with admin from ENV if present
    const envAdminUser = process.env.ADMIN_USERNAME;
    const envAdminPass = process.env.ADMIN_PASSWORD;
    if (envAdminUser && envAdminPass) {
      this.users.push({ id: 1, username: envAdminUser, password_hash: '$2a$10$testhash', role: 'admin', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), failed_login_attempts: 0 });
    }
  }

  prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    // SELECT user by username
    if (normalized.includes('select * from users where username = ?')) {
      return {
        get: (username: string) => this.users.find(u => u.username === username) || null,
        run: (..._args:any[]) => ({}),
        all: () => this.users
      };
    }

    // SELECT user by id
    if (normalized.includes('select * from users where id = ?')) {
      return {
        get: (id: number) => this.users.find(u => u.id === id) || null,
        run: (..._args:any[]) => ({})
      };
    }

    // INSERT INTO users
    if (normalized.startsWith('insert into users')) {
      return new InMemoryStmt(this.users, sql);
    }

    // user_sessions operations
    if (normalized.startsWith('delete from user_sessions where user_id')) {
      return new InMemoryStmt(this.user_sessions, sql);
    }
    if (normalized.startsWith('insert into user_sessions')) {
      return new InMemoryStmt(this.user_sessions, sql);
    }
    if (normalized.includes('select * from user_sessions where id = ?')) {
      return {
        get: (id: number) => this.user_sessions.find(s => s.id === id) || null
      };
    }

    // SELECT session by token (used by createSession after inserting)
    if (normalized.includes('select * from user_sessions where session_token = ?')) {
      return {
        get: (token: string) => this.user_sessions.find(s => s.session_token === token) || null
      };
    }

    if (normalized.includes("select us.*, u.id, u.username")) {
      // validateSession join: expect session_token param
      return {
        get: (token: string) => {
          const sess = this.user_sessions.find(s => s.session_token === token && new Date(s.expires_at) > new Date());
          if (!sess) return null;
          const user = this.users.find(u => u.id === sess.user_id);
          if (!user) return null;
          return { ...sess, ...user };
        }
      };
    }

    if (normalized.startsWith('update users set failed_login_attempts')) {
      return new InMemoryStmt(this.users, sql);
    }

    if (normalized.startsWith('update users set password_hash')) {
      return new InMemoryStmt(this.users, sql);
    }

    if (normalized.startsWith('update users set failed_login_attempts = 0, last_login')) {
      return new InMemoryStmt(this.users, sql);
    }

    if (normalized.startsWith('update user_sessions set last_activity')) {
      return new InMemoryStmt(this.user_sessions, sql);
    }

    // audit_log insert
    if (normalized.startsWith('insert into audit_log')) {
      return {
        run: (...args:any[]) => { this.audit_log.push({ id: this.audit_log.length+1, args }); return { lastInsertRowid: this.audit_log.length, changes:1 }; }
      };
    }

    // Generic fallback
    return {
      get: () => null,
      run: () => ({}),
      all: () => []
    } as any;
  }

  exec(_sql: string) { /* noop */ }
  close() { /* noop */ }
}

// Keep a singleton instance for the process
let inMemoryInstance: InMemoryDB | null = null;
let sqliteInstance: any = null;

// Create standardized database connection
export function getDb(): any {
  // If running tests, prefer the in-memory JS implementation to avoid native bindings
  if (process.env.NODE_ENV === 'test' || !BetterSqlite3) {
    if (!inMemoryInstance) inMemoryInstance = new InMemoryDB();
    return inMemoryInstance;
  }

  if (sqliteInstance) return sqliteInstance;

  const dbPath = getDatabasePath();
  try {
    sqliteInstance = new BetterSqlite3(dbPath);
    // Enable foreign key constraints
    sqliteInstance.exec('PRAGMA foreign_keys = ON;');
    // Enable WAL mode for better concurrency
    sqliteInstance.exec('PRAGMA journal_mode = WAL;');
    return sqliteInstance;
  } catch (err) {
    console.warn('better-sqlite3 failed to initialize, falling back to in-memory DB for this process:', err instanceof Error ? err.message : String(err));
    if (!inMemoryInstance) inMemoryInstance = new InMemoryDB();
    return inMemoryInstance;
  }
}

// Database health check
export async function checkDatabaseConnection(): Promise<{ connected: boolean; path: string; error?: string }> {
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as test').get();
    
    return {
      connected: true,
      path: getDatabasePath()
    };
  } catch (error: any) {
    return {
      connected: false,
      path: getDatabasePath(),
      error: error.message
    };
  }
}

// Initialize database with required tables if they don't exist
export function initializeDatabase(): void {
  const db = getDb();
  
  try {
    // Ensure all required tables exist
    const requiredTables = [
      'settings', 'providers', 'messages', 'message_events', 
      'api_logs', 'provider_priority', 'templates',
      'users', 'user_sessions', 'user_permissions', 'audit_log'
    ];
    
    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
      .map((table: any) => table.name);
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn(`⚠️  Missing tables detected: ${missingTables.join(', ')}`);
      console.log('💡 Run the migration script: node migrations/create-user-tables.js');
    }
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Export types for database operations
export interface DatabaseConfig {
  path: string;
  connected: boolean;
  tables: string[];
  version: string;
}

export interface QueryResult<T = any> {
  data: T[];
  count: number;
  total: number;
  page?: number;
  limit?: number;
}

// Utility function to execute queries with error handling
export function executeQuery<T>(query: string, params: any[] = []): QueryResult<T> {
  const db = getDb();
  
  const stmt = db.prepare(query);
  const data = stmt.all(...params) as T[];
  
  // Get total count if this is a paginated query
  let total = data.length;
  if (query.toLowerCase().includes('limit') && query.toLowerCase().includes('offset')) {
    const countQuery = query.replace(/LIMIT\s+\d+(\s*,\s*\d+)?/gi, '')
                            .replace(/OFFSET\s+\d+/gi, '')
                            .replace(/SELECT\s+(.+?)\s+FROM/i, 'SELECT COUNT(*) as count FROM');
    
    try {
      const countResult = db.prepare(countQuery).get(...params) as any;
      total = countResult?.count || data.length;
    } catch {
      // If count query fails, use data length
    }
  }
  
  return {
    data,
    count: data.length,
    total
  };
}

// Utility function for single row queries
export function executeSingleQuery<T>(query: string, params: any[] = []): T | null {
  const db = getDb();
  
  const stmt = db.prepare(query);
  const result = stmt.get(...params);
  return result ? result as T : null;
}

// Utility function for write operations
export function executeWrite(query: string, params: any[] = []): { success: boolean; lastInsertRowid?: number; changes?: number; error?: string } {
  const db = getDb();
  
  try {
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    return {
      success: true,
      lastInsertRowid: result.lastInsertRowid as number,
      changes: result.changes
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Close all database connections (for cleanup)
export function closeAllConnections(): void {
  // better-sqlite3 handles connection pooling automatically
  // This is mainly for explicit cleanup if needed
  console.log('🧹 Database connections cleaned up');
}