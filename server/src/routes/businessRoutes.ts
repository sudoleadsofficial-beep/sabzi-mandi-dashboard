import { Router } from 'express';
import { 
  getBusinesses, 
  createBusiness, 
  updateBusiness, 
  deleteBusiness, 
  updateBusinessSettings,
  getBusinessPermissions,
  updateBusinessPermissions
} from '../controllers/businessController.js';
import { authenticateToken, requireAdmin, requireSuperAdmin, enforceBusinessIsolation } from '../middleware/authMiddleware.js';

export const businessRouter = Router();

businessRouter.use(authenticateToken);
businessRouter.use(requireAdmin);
businessRouter.get('/', enforceBusinessIsolation, getBusinesses);
businessRouter.post('/', requireSuperAdmin, createBusiness);
businessRouter.put('/:id', enforceBusinessIsolation, updateBusiness);
businessRouter.delete('/:id', requireSuperAdmin, deleteBusiness);
businessRouter.put('/:id/settings', enforceBusinessIsolation, updateBusinessSettings);
businessRouter.get('/:id/permissions', enforceBusinessIsolation, getBusinessPermissions);
businessRouter.put('/:id/permissions', enforceBusinessIsolation, updateBusinessPermissions);
