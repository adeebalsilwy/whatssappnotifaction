console.log('Starting server.ts...');
import app from './app';
import { DatabaseService } from './storage/sqlite/db';
import dotenv from 'dotenv';

import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const PORT = process.env.GATEWAY_PORT || 3002;

(async () => {
    try {
        await DatabaseService.getInstance();

        app.listen(PORT, () => {
            const base = (process.env.APINOTIFICATION_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
            console.log(`✅ Notification Gateway listening on port ${PORT}`);
            console.log(`   ➜ ${base}/api/notify`);
            console.log(`   ➜ ${base}/api/admin/providers`);
        });
    } catch (err) {
        console.error('Failed to start gateway:', err);
        process.exit(1);
    }
})();
