import { Router } from 'express';
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  deleteNotification 
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export const notificationRouter = Router();

notificationRouter.use(authenticateToken);
notificationRouter.get('/', getNotifications);
notificationRouter.put('/mark-all-read', markAllNotificationsRead);
notificationRouter.put('/:id/read', markNotificationRead);
notificationRouter.delete('/:id', deleteNotification);
