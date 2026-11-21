import { Router } from 'express';
import { getUsers, updateUser, toggleUserStatus, deleteUser } from '../controllers/userController.js';
import { authenticateToken, enforceBusinessIsolation } from '../middleware/authMiddleware.js';

export const userRouter = Router();

userRouter.use(authenticateToken);
userRouter.get('/', enforceBusinessIsolation, getUsers);
userRouter.put('/:id', enforceBusinessIsolation, updateUser);
userRouter.post('/:id/toggle-status', enforceBusinessIsolation, toggleUserStatus);
userRouter.delete('/:id', enforceBusinessIsolation, deleteUser);
