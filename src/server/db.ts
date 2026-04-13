import Database from 'better-sqlite3';
import path from 'path';

import fs from 'fs';

// SQLite database instance
let sqliteDb: Database.Database | null = null;

/**
 * Get the SQLite database instance
 */
export function getDb() {
    if (!sqliteDb) {
        const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'gateway.db');
        
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        sqliteDb = new Database(dbPath);
        
        // Ensure tables exist for SQLite
        initializeSQLiteTables(sqliteDb);
    }
    return sqliteDb;
}

/**
 * Initialize required tables for SQLite
 */
function initializeSQLiteTables(db: Database.Database) {
    // Messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referenceId TEXT,
            sender TEXT,
            [to] TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL,
            providerMessageId TEXT,
            priority TEXT,
            metadata TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Message events table
    db.exec(`
        CREATE TABLE IF NOT EXISTS message_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            messageId INTEGER NOT NULL,
            eventType TEXT NOT NULL,
            eventPayload TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
        );
    `);

    // API logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requestId TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL,
            requestHeadersMasked TEXT,
            requestBodyMasked TEXT,
            responseStatus INTEGER,
            responseBody TEXT,
            latencyMs INTEGER,
            ip TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Templates table for professional template storage
    db.exec(`
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            language TEXT NOT NULL,
            category TEXT NOT NULL,
            components TEXT NOT NULL, -- JSON string of components
            variables TEXT, -- JSON string of variable names
            description TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, language)
        );
    `);
}

/**
 * Check if we're using SQLite (always true after migration)
 */
export function isUsingSQLite(): boolean {
    return true;
}

/**
 * Execute a query using SQLite database
 * Returns the result in a compatible format
 */
export async function executeQuery(query: string, params?: any[]) {
    const db = getDb() as Database.Database;
    
    if (query.toUpperCase().includes('INSERT') && query.toUpperCase().includes('RETURNING')) {
        // Handle INSERT with RETURNING for SQLite
        const stmt = db.prepare(query.replace(/\$([0-9]+)/g, '?').replace(/RETURNING.*$/i, ''));
        const result = stmt.run(params || []);
        
        // Return in format compatible with PostgreSQL
        return {
            rows: [{ id: result.lastInsertRowid }],
            rowCount: 1
        };
    } else if (query.toUpperCase().includes('SELECT')) {
        // Handle SELECT queries
        const stmt = db.prepare(query.replace(/\$([0-9]+)/g, '?'));
        const rows = stmt.all(params || []);
        
        return {
            rows: rows,
            rowCount: rows.length
        };
    } else {
        // Handle other queries (UPDATE, DELETE, etc.)
        const stmt = db.prepare(query.replace(/\$([0-9]+)/g, '?'));
        const result = stmt.run(params || []);
        
        return {
            rowCount: result.changes
        };
    }
}

export async function initDb() {
    // SQLite tables are created in initializeSQLiteTables function
    initializeSQLiteTables(getDb() as Database.Database);
}