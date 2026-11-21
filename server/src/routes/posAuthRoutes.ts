import { Router } from 'express';
import { 
  checkStatus, 
  activate, 
  login, 
  getPosSyncData 
} from '../controllers/posAuthController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export const posAuthRouter = Router();

// Public POS authentication and activation endpoints
posAuthRouter.all('/check-status', checkStatus);
posAuthRouter.post('/activate', activate);
posAuthRouter.post('/login', login);

// Authenticated POS sync endpoint
posAuthRouter.get('/sync-data', authenticateToken, getPosSyncData);
