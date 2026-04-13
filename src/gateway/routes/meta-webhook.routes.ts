import express, { Request, Response } from 'express';
import { MetaWebhookController } from '@/gateway/controllers/meta-webhook.controller';

const router = express.Router();
const controller = new MetaWebhookController();

/**
 * Meta Webhook Verification Endpoint
 * GET /api/webhooks/meta
 */
router.get('/meta', async (req: Request, res: Response) => {
    await controller.verifyWebhook(req, res);
});

/**
 * Meta Webhook Events Endpoint
 * POST /api/webhooks/meta
 */
router.post('/meta', express.json({ verify: (req, res, buf) => {
    // Store raw body for signature verification
    (req as any).rawBody = buf.toString();
}}), async (req: Request, res: Response) => {
    await controller.handleWebhook(req, res);
});

/**
 * Get Webhook Status Information
 * GET /api/webhooks/meta/status
 */
router.get('/meta/status', async (req: Request, res: Response) => {
    await controller.getStatus(req, res);
});

/**
 * Get Recent Delivery Status
 * GET /api/webhooks/meta/recent
 */
router.get('/meta/recent', async (req: Request, res: Response) => {
    try {
        const { limit = 50 } = req.query;
        const statuses = await controller['deliveryTracker'].getRecentDeliveryStatus(Number(limit));
        res.json({
            success: true,
            data: statuses
        });
    } catch (error: any) {
        console.error('[Meta Webhook] Error getting recent status:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;