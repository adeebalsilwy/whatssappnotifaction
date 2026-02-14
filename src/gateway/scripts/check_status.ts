import { DatabaseService } from '../storage/sqlite/db';

async function check() {
    const db = await DatabaseService.getInstance();
    const row = await db.get<any>('SELECT * FROM messages ORDER BY createdAt DESC LIMIT 1');
    console.log('Latest Message:', row);
}

check();
