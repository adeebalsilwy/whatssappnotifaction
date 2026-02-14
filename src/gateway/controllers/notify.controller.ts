import { Request, Response } from 'express';
import { TransactionIdService } from '../services/transactionid.service';
import { ValidationService } from '../services/validation.service';
import { DispatchService } from '../services/dispatch.service';
import { MessagesRepository } from '../storage/sqlite/repositories/messages.repo';
import { JsonFileStore } from '../storage/filestore/json.store';
import path from 'path';

export class NotifyController {
    private dispatchService: DispatchService;
    private messagesRepo: MessagesRepository;
    private ingressLogger: JsonFileStore;
    private egressLogger: JsonFileStore;

    constructor() {
        this.dispatchService = new DispatchService();
        this.messagesRepo = new MessagesRepository();
        this.ingressLogger = new JsonFileStore(path.join(process.cwd(), 'src/gateway/logs/ingress'));
        this.egressLogger = new JsonFileStore(path.join(process.cwd(), 'src/gateway/logs/egress'));
    }

    handleNotify = async (req: Request, res: Response) => {
        const startTime = Date.now();
        try {
            const { mobileNo, message, transID, priority } = req.body;
            const requestIp = req.ip || req.socket.remoteAddress; // Fixed IP access

            if (!mobileNo || !message) {
                res.status(400).json({ error: 'mobileNo and message are required' });
                return;
            }

            const normalizedMobile = ValidationService.normalizeMobileNo(mobileNo);
            const transactionId = transID || TransactionIdService.generate(normalizedMobile);

            // Log Ingress
            await this.ingressLogger.save(transactionId, {
                headers: req.headers,
                body: req.body,
                ip: requestIp,
                timestamp: new Date().toISOString()
            });

            // Persist (Async now)
            await this.messagesRepo.create({
                transId: transactionId,
                mobileNo: normalizedMobile,
                message: message,
                priority: priority || 'NORMAL',
                status: 'RECEIVED',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Dispatch Logic
            // We can await explicitly here or let it run. User wanted "QUEUED" response quickly?
            // But now we are async all the way.
            // If we await dispatch, we can give real status.
            // But adhering to "return QUEUED" implies async process.

            this.dispatchService.dispatch(transactionId, normalizedMobile, message, priority)
                .then(async ({ provider, result }) => {
                    await this.messagesRepo.updateStatus(
                        transactionId,
                        result.success ? 'SENT' : 'FAILED',
                        result.providerMessageId,
                        result.error
                    );

                    await this.egressLogger.save(transactionId, {
                        provider,
                        result,
                        latency: Date.now() - startTime
                    });
                })
                .catch(async (err) => {
                    console.error("Dispatch Error:", err);
                    await this.messagesRepo.updateStatus(transactionId, 'FAILED', undefined, 'Dispatch Error: ' + err.message);
                });

            res.status(200).json({
                transID: transactionId,
                status: 'QUEUED',
                message: 'Notification processing started'
            });

        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
}
