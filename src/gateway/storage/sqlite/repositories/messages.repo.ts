import { DatabaseService } from '../db';

export interface MessageRecord {
    transId: string;
    mobileNo: string;
    message: string;
    priority: string;
    selectedProvider?: string;
    status: 'RECEIVED' | 'QUEUED' | 'SENT' | 'FAILED';
    providerMessageId?: string;
    createdAt: string;
    updatedAt: string;
    lastError?: string;
}

export class MessagesRepository {
    async create(msg: MessageRecord): Promise<void> {
        const db = await DatabaseService.getInstance();
        await db.run(`
      INSERT INTO messages (transId, mobileNo, message, priority, selectedProvider, status, providerMessageId, createdAt, updatedAt, lastError)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
            msg.transId,
            msg.mobileNo,
            msg.message,
            msg.priority,
            msg.selectedProvider || null,
            msg.status,
            msg.providerMessageId || null,
            msg.createdAt,
            msg.updatedAt,
            msg.lastError || null
        );
    }

    async updateStatus(transId: string, status: string, providerMessageId?: string, error?: string): Promise<void> {
        const db = await DatabaseService.getInstance();
        const updatedAt = new Date().toISOString();
        let query = 'UPDATE messages SET status = ?, updatedAt = ?';
        const params: any[] = [status, updatedAt];

        if (providerMessageId !== undefined) {
            query += ', providerMessageId = ?';
            params.push(providerMessageId);
        }
        if (error !== undefined) {
            query += ', lastError = ?';
            params.push(error);
        }

        query += ' WHERE transId = ?';
        params.push(transId);

        await db.run(query, ...params);
    }

    async getById(transId: string): Promise<MessageRecord | undefined> {
        const db = await DatabaseService.getInstance();
        const row = await db.get<any>('SELECT * FROM messages WHERE transId = ?', transId);
        if (!row) return undefined;
        return row as MessageRecord;
    }
}
