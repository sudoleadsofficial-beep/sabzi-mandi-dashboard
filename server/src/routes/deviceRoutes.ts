import { Router } from 'express';
import { getDevices, getSyncRecords, triggerSyncRetry } from '../controllers/deviceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export const deviceRouter = Router();

deviceRouter.use(authenticateToken);
deviceRouter.get('/', getDevices);
deviceRouter.get('/sync-records', getSyncRecords);
deviceRouter.post('/sync-retry/:id', triggerSyncRetry);
