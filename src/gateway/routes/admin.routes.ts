import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const adminController = new AdminController();

router.get('/providers', adminController.getProviders);
router.put('/providers/:id', adminController.updateProvider);
router.get('/settings', adminController.getSettings);

export default router;
