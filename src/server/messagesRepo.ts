import { getDb, executeQuery, executeSingleQuery, executeWrite } from '@/lib/db';
// Import types locally to avoid circular reference

export interface MessageFilter {
    status?: string;
    mobileNo?: string;
    dateFrom?: string;
    dateTo?: string;
    transId?: string;
}

export interface Message {
    transId: string;
    mobileNo: string;
    message: string;
    priority: string;
    selectedProvider?: string;
    status: string;
    providerMessageId?: string;
    createdAt: string;
    updatedAt: string;
    lastError?: string;
}

export function getMessages(filter: MessageFilter = {}, limit = 100, offset = 0): { data: Message[], total: number } {
    let query = 'SELECT * FROM messages WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as count FROM messages WHERE 1=1';
    const params: any[] = [];

    if (filter.status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(filter.status);
    }

    if (filter.mobileNo) {
        query += ' AND mobileNo LIKE ?';
        countQuery += ' AND mobileNo LIKE ?';
        params.push(`%${filter.mobileNo}%`);
    }

    if (filter.transId) {
        query += ' AND transId LIKE ?';
        countQuery += ' AND transId LIKE ?';
        params.push(`%${filter.transId}%`);
    }

    // Date filtering logic (assuming ISO strings in DB)
    if (filter.dateFrom) {
        query += ' AND createdAt >= ?';
        countQuery += ' AND createdAt >= ?';
        params.push(filter.dateFrom);
    }
    if (filter.dateTo) {
        query += ' AND createdAt <= ?';
        countQuery += ' AND createdAt <= ?';
        params.push(filter.dateTo);
    }

    const countResult = executeSingleQuery<{ count: number }>(countQuery, params);
    const total = countResult?.count || 0;

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    const result = executeQuery<Message>(query, [...params, limit, offset]);

    return { data: result.data, total };
}

export function resendMessage(transId: string): boolean {
    // Logic to reset status to RECEIVED so Dispatcher picks it up?
    // OR create a new transaction?
    // If we update to 'RECEIVED' and clear error, the Gateway (if polling) would pick it up.
    // BUT my Gateway implementation receives HTTP requests. It doesn't poll DB for new messages (yet).
    // The `NotifyController` handles dispatch.

    // To support "Resend", we should probably trigger the internal DispatchService or call the API.
    // Since this is Next.js Server Action context, calling localhost API is safest and easiest ensuring full flow.

    // We will just return false for now if not implemented fully, or implement API call.
    return false;
}
