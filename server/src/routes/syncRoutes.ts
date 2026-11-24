import { Router } from 'express';
import { 
  pushEvents, 
  pullEventsController, 
  getSyncStatus, 
  registerDeviceController,
  getSyncPermissions
} from '../controllers/syncController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifySyncDevice } from '../middleware/syncAuthMiddleware.js';

export const syncRouter = Router();

// Device registration & credential rotation (requires authenticated user token)
syncRouter.post('/register', authenticateToken, registerDeviceController);

// Device synchronization operations (require authenticated token + verified registered device)
syncRouter.post('/push', authenticateToken, verifySyncDevice, pushEvents);
syncRouter.get('/pull', authenticateToken, verifySyncDevice, pullEventsController);
syncRouter.post('/pull', authenticateToken, verifySyncDevice, pullEventsController);
syncRouter.get('/status', authenticateToken, verifySyncDevice, getSyncStatus);

// Role & feature permissions endpoint (flexible auth: supports token, device ID, business ID, or active fallback)
syncRouter.get('/permissions', getSyncPermissions);
