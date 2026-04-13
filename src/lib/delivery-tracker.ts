import { DatabaseService } from '@/gateway/storage/sqlite/db';

export interface MessageStatusRecord {
    id: string;
    transId: string;
    message_id: string;
    provider_id: string;
    status: 'ACCEPTED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REJECTED';
    timestamp: string;
    reason?: string;
    error_code?: string;
    error_message?: string;
    metadata?: string;
    created_at: string;
}

export interface DeliveryStats {
    total_sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    delivery_rate: number;
}

export class DeliveryTracker {
    private static instance: DeliveryTracker;
    
    private constructor() {}
    
    public static getInstance(): DeliveryTracker {
        if (!DeliveryTracker.instance) {
            DeliveryTracker.instance = new DeliveryTracker();
        }
        return DeliveryTracker.instance;
    }

    /**
     * Create a new message status record
     */
    async createStatusRecord(record: Omit<MessageStatusRecord, 'id' | 'created_at'>): Promise<void> {
        const db = await DatabaseService.getInstance();
        const timestamp = new Date().toISOString();
        
        await db.run(`
            INSERT INTO message_status (
                transId, message_id, provider_id, status, timestamp, 
                reason, error_code, error_message, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, 
            record.transId,
            record.message_id,
            record.provider_id,
            record.status,
            record.timestamp,
            record.reason || null,
            record.error_code || null,
            record.error_message || null,
            record.metadata || null,
            timestamp
        );
    }

    /**
     * Update message status
     */
    async updateMessageStatus(transId: string, status: string, providerMessageId?: string, error?: string): Promise<void> {
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

    /**
     * Get message status history
     */
    async getMessageStatusHistory(transId: string): Promise<MessageStatusRecord[]> {
        const db = await DatabaseService.getInstance();
        const rows = await db.all<any[]>(
            'SELECT * FROM message_status WHERE transId = ? ORDER BY timestamp DESC',
            transId
        );
        return rows as MessageStatusRecord[];
    }

    /**
     * Get delivery statistics
     */
    async getDeliveryStats(hours: number = 24): Promise<DeliveryStats> {
        const db = await DatabaseService.getInstance();
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
        
        const result = await db.get<any>(`
            SELECT 
                COUNT(*) as total_sent,
                COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered,
                COUNT(CASE WHEN status = 'READ' THEN 1 END) as read,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
                COUNT(CASE WHEN status IN ('ACCEPTED', 'SENT') THEN 1 END) as pending
            FROM message_status 
            WHERE timestamp >= ? AND status IN ('DELIVERED', 'READ', 'FAILED', 'ACCEPTED', 'SENT')
        `, since);
        
        const stats: DeliveryStats = {
            total_sent: result.total_sent || 0,
            delivered: result.delivered || 0,
            read: result.read || 0,
            failed: result.failed || 0,
            pending: result.pending || 0,
            delivery_rate: result.total_sent > 0 ? 
                Math.round(((result.delivered + result.read) / result.total_sent) * 10000) / 100 : 0
        };
        
        return stats;
    }

    /**
     * Get failed messages with reasons
     */
    async getFailedMessages(hours: number = 24): Promise<MessageStatusRecord[]> {
        const db = await DatabaseService.getInstance();
        const since = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
        
        const rows = await db.all<any[]>(`
            SELECT * FROM message_status 
            WHERE status = 'FAILED' AND timestamp >= ? 
            ORDER BY timestamp DESC
        `, since);
        
        return rows as MessageStatusRecord[];
    }

    /**
     * Get recent message delivery status
     */
    async getRecentDeliveryStatus(limit: number = 50): Promise<MessageStatusRecord[]> {
        const db = await DatabaseService.getInstance();
        const rows = await db.all<any[]>(`
            SELECT ms.*, m.message, m.mobileNo, m.createdAt as message_created_at
            FROM message_status ms
            JOIN messages m ON ms.transId = m.transId
            ORDER BY ms.timestamp DESC
            LIMIT ?
        `, limit);
        
        return rows as MessageStatusRecord[];
    }
}