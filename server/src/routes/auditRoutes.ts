import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export const auditRouter = Router();

auditRouter.use(authenticateToken);
auditRouter.get('/', getAuditLogs);
