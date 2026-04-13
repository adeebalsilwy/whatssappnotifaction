import express from 'express';
import notifyRouter from './routes/notify.routes';
import adminRouter from './routes/admin.routes';
import webhooksRouter from './routes/webhooks.routes';
import metaWebhookRouter from './routes/meta-webhook.routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', notifyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/webhooks', metaWebhookRouter);

export default app;

