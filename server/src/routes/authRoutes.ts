import { Router } from 'express';
import { login, logout, me, changePassword, updateProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticateToken, me);
authRouter.post('/change-password', authenticateToken, changePassword);
authRouter.put('/profile', authenticateToken, updateProfile);
