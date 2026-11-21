import { Router } from 'express';
import { 
  sendInvitation, 
  verifyInvitation, 
  acceptInvitation, 
  acceptEmployeeInvitation,
  getInvitations, 
  cancelInvitation 
} from '../controllers/invitationController.js';
import { isSmtpConfigured } from '../services/emailService.js';
import { authenticateToken, requireAdmin, enforceBusinessIsolation } from '../middleware/authMiddleware.js';

export const invitationRouter = Router();

// Public routes for accepting/verifying tokens & checking SMTP
invitationRouter.get('/smtp-status', (req, res) => {
  res.json({
    configured: isSmtpConfigured(),
    host: process.env.SMTP_HOST || null,
    from: process.env.SMTP_FROM || null,
  });
});

invitationRouter.get('/verify', verifyInvitation);
invitationRouter.post('/accept', acceptInvitation);
invitationRouter.post('/accept-employee', acceptEmployeeInvitation);

// Protected routes (requires authentication & admin role & business isolation)
invitationRouter.use(authenticateToken);
invitationRouter.use(requireAdmin);
invitationRouter.get('/', enforceBusinessIsolation, getInvitations);
invitationRouter.post('/send', enforceBusinessIsolation, sendInvitation);
invitationRouter.post('/:id/cancel', enforceBusinessIsolation, cancelInvitation);
