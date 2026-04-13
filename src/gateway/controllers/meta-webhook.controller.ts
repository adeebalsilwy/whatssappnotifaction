import { Request, Response } from 'express';
import { DeliveryTracker } from '@/lib/delivery-tracker';
import { verifyXHubSignature } from '@/lib/metaWebhook';
import { MessagesRepository } from '@/gateway/storage/sqlite/repositories/messages.repo';

export class MetaWebhookController {
    private deliveryTracker: DeliveryTracker;
    private messagesRepo: MessagesRepository;

    constructor() {
        this.deliveryTracker = DeliveryTracker.getInstance();
        this.messagesRepo = new MessagesRepository();
    }

    /**
     * Handle Meta webhook verification
     */
    async verifyWebhook(req: Request, res: Response): Promise<void> {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        console.log('[Meta Webhook] Verification request received:', { mode, token });

        // Check if verification token matches
        const allowedTokens = [process.env.META_WEBHOOK_VERIFY_TOKEN];
        if (mode === 'subscribe' && token && allowedTokens.includes(token as string)) {
            console.log('[Meta Webhook] Verification successful');
            res.status(200).send(challenge);
            return;
        }

        console.log('[Meta Webhook] Verification failed');
        res.status(403).send('Verification failed');
    }

    /**
     * Handle Meta webhook events
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            // Verify webhook signature for security
            const signature = req.header('x-hub-signature-256');
            const rawBody = JSON.stringify(req.body);
            const appSecret = process.env.META_APP_SECRET;

            if (appSecret && !verifyXHubSignature(signature, rawBody, appSecret)) {
                console.warn('[Meta Webhook] Invalid signature');
                res.status(401).send('Unauthorized');
                return;
            }

            // Respond quickly to avoid timeout (within 10 seconds)
            res.status(200).send('OK');

            // Process webhook asynchronously
            this.processWebhookEvent(req.body).catch(error => {
                console.error('[Meta Webhook] Error processing event:', error);
            });

        } catch (error: any) {
            console.error('[Meta Webhook] Error handling webhook:', error);
            // Still send 200 to avoid webhook retries
            res.status(200).send('OK');
        }
    }

    /**
     * Process webhook event asynchronously
     */
    private async processWebhookEvent(body: any): Promise<void> {
        console.log('[Meta Webhook] Processing event:', JSON.stringify(body, null, 2));

        // Handle different types of webhook events
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        await this.processMessageStatus(change.value);
                    }
                }
            }
        }
    }

    /**
     * Process message status updates
     */
    private async processMessageStatus(value: any): Promise<void> {
        const { statuses, messages } = value;

        // Process delivery statuses
        if (statuses && Array.isArray(statuses)) {
            for (const status of statuses) {
                await this.processStatusUpdate(status);
            }
        }

        // Process incoming messages (if any)
        if (messages && Array.isArray(messages)) {
            for (const message of messages) {
                await this.processIncomingMessage(message);
            }
        }
    }

    /**
     * Process individual status update
     */
    private async processStatusUpdate(status: any): Promise<void> {
        const { id: messageId, status: statusType, timestamp, recipient_id, errors } = status;
        
        console.log(`[Meta Webhook] Status update for message ${messageId}: ${statusType}`);

        // Map Meta status to our internal status
        const statusMap: Record<string, string> = {
            'sent': 'SENT',
            'delivered': 'DELIVERED',
            'read': 'READ',
            'failed': 'FAILED',
            'deleted': 'FAILED'
        };

        const internalStatus = statusMap[statusType] || 'SENT';
        let errorMessage = '';
        let errorCode = '';

        // Handle errors
        if (errors && errors.length > 0) {
            const error = errors[0];
            errorCode = error.code || '';
            errorMessage = error.title || error.message || '';
            console.log(`[Meta Webhook] Message ${messageId} failed: ${errorCode} - ${errorMessage}`);
        }

        // Find the transaction ID by message ID
        const message = await this.messagesRepo.getById(messageId);
        const transId = message?.transId || messageId;

        // Create status record
        await this.deliveryTracker.createStatusRecord({
            transId,
            message_id: messageId,
            provider_id: 'meta',
            status: internalStatus as any,
            timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            reason: statusType,
            error_code: errorCode,
            error_message: errorMessage,
            metadata: JSON.stringify({ recipient_id, status_details: status })
        });

        // Update message status in main table
        const errorInfo = errorCode ? `${errorCode}: ${errorMessage}` : undefined;
        await this.messagesRepo.updateStatus(transId, internalStatus, messageId, errorInfo);

        console.log(`[Meta Webhook] Updated message ${messageId} status to ${internalStatus}`);
    }

    /**
     * Process incoming messages
     */
    private async processIncomingMessage(message: any): Promise<void> {
        const { id, from, timestamp, text, type } = message;
        
        console.log(`[Meta Webhook] Incoming message from ${from}:`, message);

        // TODO: Store incoming message in database
        // TODO: Process auto-replies if needed
        // TODO: Forward to appropriate system
    }

    /**
     * Get webhook status information
     */
    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const stats = await this.deliveryTracker.getDeliveryStats(24);
            const failedMessages = await this.deliveryTracker.getFailedMessages(24);
            
            res.json({
                success: true,
                stats,
                failed_messages: failedMessages.length,
                last_updated: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('[Meta Webhook] Error getting status:', error);
            res.status(500).json({ error: error.message });
        }
    }
}