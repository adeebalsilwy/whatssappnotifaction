import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * Vonage Inbound Messages Webhook
 * Receives incoming WhatsApp messages from Vonage
 */
router.post('/vonage/inbound', async (req: Request, res: Response) => {
    try {
        console.log('[Vonage Webhook] Inbound message received:', JSON.stringify(req.body, null, 2));

        const { message_uuid, from, to, channel, message_type, text, timestamp } = req.body;

        // TODO: Store inbound message in database
        // TODO: Process auto-replies if needed
        // TODO: Forward to Temenos if required

        res.status(200).json({ status: 'received' });
    } catch (error: any) {
        console.error('[Vonage Webhook] Error processing inbound:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Vonage Status Updates Webhook
 * Receives delivery status updates (submitted, delivered, read, failed)
 */
router.post('/vonage/status', async (req: Request, res: Response) => {
    try {
        console.log('[Vonage Webhook] Status update received:', JSON.stringify(req.body, null, 2));

        const { message_uuid, status, timestamp, client_ref, error } = req.body;

        // Update message status in database
        if (client_ref) {
            const { MessagesRepository } = await import('../storage/sqlite/repositories/messages.repo');
            const repo = new MessagesRepository();

            const statusMap: Record<string, string> = {
                'submitted': 'QUEUED',
                'delivered': 'SENT',
                'read': 'SENT',
                'rejected': 'FAILED',
                'failed': 'FAILED'
            };

            const newStatus = statusMap[status] || 'QUEUED';
            const errorMsg = error ? `${error.type}: ${error.title}` : undefined;

            await repo.updateStatus(client_ref, newStatus, message_uuid, errorMsg);
            console.log(`[Vonage Webhook] Updated ${client_ref} to ${newStatus}`);
        }

        res.status(200).json({ status: 'processed' });
    } catch (error: any) {
        console.error('[Vonage Webhook] Error processing status:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
