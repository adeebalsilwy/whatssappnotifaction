import { getDb, executeQuery, executeSingleQuery, executeWrite } from '@/lib/db';
import type { AppConfig, Provider } from '@/lib/types';

// Ensure tables exist
function ensureTablesExist(): void {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        config TEXT
      );
    `);
  } finally {
  }
}

// Initialize tables on module load
ensureTablesExist();

const KNOWN_PROVIDERS: Provider[] = ['meta', 'vonage', 'twilio', 'legacy', 'generic', 'direct'];


export function getSettings(): AppConfig {
  const db = getDb();
  
  try {
    // 1. Get Default Provider
    const defaultProvRow = db.prepare("SELECT value FROM settings WHERE key = 'default_provider'").get() as { value: string } | undefined;
    // Default to meta if not set
    const defaultProvider = (defaultProvRow?.value as Provider) || 'meta';

    // 2. Get Providers Config
    const rows = db.prepare('SELECT id, enabled, config FROM providers').all() as { id: string, enabled: number, config: string }[];

    const providersMap: Record<string, any> = {};

    for (const row of rows) {
      let cfg = {};
      try { cfg = JSON.parse(row.config); } catch { }

      // Map specific fields back to AppConfig structure if needed, or just pass clean config
      // AppConfig expects flattened: { url, token, apiKey... }
      // My gateway config is also JSON: { apiKey, apiSecret, ... }
      // So mostly 1:1, but let's be safe.
      providersMap[row.id] = {
        ...cfg,
        enabled: !!row.enabled
      };
    }

    // Ensure all known providers exist in output even if empty
    const providersOut: any = {};
    for (const p of KNOWN_PROVIDERS) {
      // Legacy might be mapped to 'generic' or 'legacy' in AppConfig?
      // Let's assume user uses 'legacy' ID in my DB.
      providersOut[p] = providersMap[p] || {};
    }

    return {
      defaultProvider,
      providers: providersOut
    };
  } finally {
  }
}

export function upsertSettings(input: AppConfig): void {
  const db = getDb();
  
  try {
    const defaults = input.defaultProvider;

    // 1. Save Default Provider
    db.prepare("INSERT INTO settings (key, value) VALUES ('default_provider', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(defaults);

    // 2. Save Provider Configs
    // Iterate known ones
    for (const name of KNOWN_PROVIDERS) {
      const cfgInput = (input.providers as any)[name] || {};

      // If the UI passes 'enabled', use it, otherwise default false? 
      // Or preserve existing enabled state?
      // The UI likely sends the whole config object.

      // Check if existing to preserve 'enabled' if not passed
      const existing = db.prepare('SELECT enabled FROM providers WHERE id = ?').get(name) as { enabled: number } | undefined;
      const enabled = (cfgInput as any).enabled !== undefined ? (cfgInput as any).enabled : (existing?.enabled || 0);

      // Clean config to store only provider props
      // Removing 'enabled' from the JSON blob to avoid duplication?
      const { enabled: _, ...restConfig } = cfgInput as any;

      db.prepare(`INSERT INTO providers (id, enabled, config) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled, config=excluded.config`)
        .run(name, enabled ? 1 : 0, JSON.stringify(restConfig));
    }
  } finally {
  }
}
