import { Router } from 'express';
import { NotifyController } from '../controllers/notify.controller';

const router = Router();
const notifyController = new NotifyController();

router.post('/notify', notifyController.handleNotify);

export default router;
