import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/appConfig.js';
import { isSuperAdminRole, isClientAdminRole, normalizeAssignedRole } from '../controllers/invitationController.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId?: string | null;
  business_id?: string | null;
  businessName?: string | null;
  business_name?: string | null;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      businessId?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT Bearer token
 * Also gracefully supports development x-user-* headers if JWT is not yet attached
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret) as any;
      const normalizedRole = normalizeAssignedRole(decoded.role || '');
      req.user = {
        ...decoded,
        businessId: decoded.businessId || decoded.business_id || null,
        role: normalizedRole,
      };
      return next();
    } catch (err: any) {
      console.warn('[Auth Middleware] Invalid or expired JWT token:', err.message);
      res.status(401).json({
        success: false,
        message: 'Your session has expired or is invalid. Please sign in again.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }
  }

  // Graceful fallback for internal API calls with user headers during transition
  const fallbackRole = req.headers['x-user-role'] as string;
  const fallbackBiz = req.headers['x-user-business-id'] as string;
  const fallbackId = req.headers['x-user-id'] as string;

  if (fallbackRole) {
    req.user = {
      id: fallbackId || 'anonymous',
      name: 'User',
      email: '',
      role: normalizeAssignedRole(fallbackRole),
      businessId: fallbackBiz || null,
    };
    return next();
  }

  // Not authenticated
  req.user = undefined;
  next();
}

/**
 * Require valid authentication for the route
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required to access this resource.',
    });
    return;
  }
  next();
}

/**
 * Require platform Super Admin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();

  if (role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Super Admin access required for this action.',
    });
    return;
  }

  next();
}

/**
 * Require Customer Admin or Super Admin role (restricts employee access to administrative functions)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();

  if (!isSuperAdminRole(role) && !isClientAdminRole(role)) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access (Super Admin or Customer Admin) is required for this route.',
    });
    return;
  }

  next();
}

/**
 * Enforce multi-tenant business data isolation
 */
export function enforceBusinessIsolation(req: Request, res: Response, next: NextFunction): void {
  const role = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();
  const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string);

  // Super Admin can access all businesses
  if (isSuperAdminRole(role)) {
    return next();
  }

  // Customer Admin and business employees are strictly bound to their own business
  if (isClientAdminRole(role) || role === 'EMPLOYEE' || role === 'MANAGER' || role === 'CASHIER' || role === 'ACCOUNTANT') {
    const requestedBusinessId = (req.query.businessId as string) || req.body?.businessId || req.params?.id;

    if (requestedBusinessId && requestedBusinessId !== 'ALL' && callerBusinessId && requestedBusinessId !== callerBusinessId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access data outside your authorized business.',
      });
      return;
    }

    req.businessId = callerBusinessId || undefined;
  }

  next();
}
