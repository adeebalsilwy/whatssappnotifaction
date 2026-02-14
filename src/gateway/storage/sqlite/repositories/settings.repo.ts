import { DatabaseService } from '../db';

export class SettingsRepository {
    async get(key: string): Promise<any> {
        const db = await DatabaseService.getInstance();
        const row = await db.get<any>('SELECT value FROM settings WHERE key = ?', key);
        if (!row) return null;
        return JSON.parse(row.value);
    }

    async set(key: string, value: any): Promise<void> {
        const db = await DatabaseService.getInstance();
        // ON CONFLICT replacement logic since standard SQLite might vary, but mostly ON CONFLICT works. Does 'sqlite' wrapper support it? Yes.
        await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            key, JSON.stringify(value)
        );
    }
}
