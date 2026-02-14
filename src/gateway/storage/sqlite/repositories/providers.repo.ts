import { DatabaseService } from '../db';

export interface ProviderConfig {
    id: string;
    enabled: boolean;
    config: any;
}

export class ProvidersRepository {
    async getAll(): Promise<ProviderConfig[]> {
        const db = await DatabaseService.getInstance();
        const rows = await db.all<any[]>('SELECT * FROM providers');
        return rows.map(row => ({
            id: row.id,
            enabled: !!row.enabled,
            config: JSON.parse(row.config)
        }));
    }

    async getById(id: string): Promise<ProviderConfig | undefined> {
        const db = await DatabaseService.getInstance();
        const row = await db.get<any>('SELECT * FROM providers WHERE id = ?', id);
        if (!row) return undefined;
        return {
            id: row.id,
            enabled: !!row.enabled,
            config: JSON.parse(row.config)
        };
    }

    async update(id: string, enabled: boolean, config: any): Promise<void> {
        const db = await DatabaseService.getInstance();
        await db.run('UPDATE providers SET enabled = ?, config = ? WHERE id = ?',
            enabled ? 1 : 0, JSON.stringify(config), id
        );
    }
}
