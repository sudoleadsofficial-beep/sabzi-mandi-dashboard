import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { authConfig } from '../config/appConfig.js';
import { recordAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

export const ALL_POS_FEATURE_KEYS = [
  'new_sale',
  'wasooli',
  'stock_management',
  'customers',
  'farmers',
  'bank_accounts',
  'deposit_transfer',
  'cheques',
  'investment_capital',
  'merchant_khata',
  'farmer_khata',
  'reports',
  'expiry_gifts',
  'discount_rules',
  'backup_restore',
];

export const DEFAULT_EMPLOYEE_FEATURES = [
  'new_sale',
  'wasooli',
  'stock_management',
  'customers',
  'farmers',
  'merchant_khata',
  'farmer_khata',
];

export async function getBusinessRolePermissions(businessId: string | null | undefined, role: string): Promise<string[]> {
  const normRole = (role || '').trim().toUpperCase();
  if (normRole === 'ADMIN' || normRole === 'CUSTOMER_ADMIN' || normRole === 'SUPER_ADMIN' || normRole === 'OWNER') {
    return [...ALL_POS_FEATURE_KEYS];
  }

  if (!businessId) {
    return [...DEFAULT_EMPLOYEE_FEATURES];
  }

  try {
    const res = await pool.query('SELECT settings FROM businesses WHERE id = $1', [businessId]);
    if (res.rows.length > 0 && res.rows[0].settings) {
      const rolePermissions = res.rows[0].settings.rolePermissions;
      if (Array.isArray(rolePermissions)) {
        const empRole = rolePermissions.find((r: any) => (r.name || '').toLowerCase() === 'employee');
        if (empRole && Array.isArray(empRole.allowedFeatures)) {
          return empRole.allowedFeatures.filter((f: string) => ALL_POS_FEATURE_KEYS.includes(f));
        }
      }
    }
  } catch (err) {
    console.error('[POS Auth] Error reading role permissions from DB:', err);
  }

  return [...DEFAULT_EMPLOYEE_FEATURES];
}

/**
 * Checks employee account and invitation status for POS terminal
 */
export async function checkStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawEmail = (req.body?.email || req.query?.email || '') as string;
    if (!rawEmail || typeof rawEmail !== 'string') {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const cleanEmail = rawEmail.trim().toLowerCase();

    // 1. Check user record
    const userRes = await pool.query(
      `
      SELECT u.id, u.email, u.name, u.role, u.status AS user_status, u.business_id,
             b.name AS business_name, b.city AS business_city, b.mandi_location, b.status AS business_status
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE LOWER(TRIM(u.email)) = $1
      LIMIT 1;
      `,
      [cleanEmail]
    );

    // 2. Check latest invitation record
    const inviteRes = await pool.query(
      `
      SELECT i.id, i.email, i.name, i.role, i.status AS invite_status, i.expires_at, i.business_id,
             b.name AS business_name, b.city AS business_city, b.mandi_location
      FROM invitations i
      LEFT JOIN businesses b ON i.business_id = b.id
      WHERE LOWER(TRIM(i.email)) = $1
      ORDER BY i.created_at DESC
      LIMIT 1;
      `,
      [cleanEmail]
    );

    const user = userRes.rows[0];
    const invite = inviteRes.rows[0];

    // If neither exists
    if (!user && !invite) {
      res.status(200).json({
        success: true,
        status: 'NOT_FOUND',
        message: 'No account or invitation found for this email address.',
      });
      return;
    }

    // Check cancelled/revoked invitation FIRST
    if (invite && invite.invite_status === 'Cancelled') {
      res.status(200).json({
        success: true,
        status: 'REVOKED',
        message: 'Your invitation has been cancelled or revoked by an administrator.',
      });
      return;
    }

    // Check expired invitation
    if (invite && (invite.invite_status === 'Expired' || (new Date(invite.expires_at) < new Date() && invite.invite_status !== 'Activated'))) {
      res.status(200).json({
        success: true,
        status: 'EXPIRED',
        message: 'Your invitation has expired. Please request a new invitation from your administrator.',
      });
      return;
    }

    // If active user exists
    if (user && user.user_status === 'Active') {
      res.status(200).json({
        success: true,
        status: 'ACTIVE',
        name: user.name,
        role: user.role,
        businessId: user.business_id,
        businessName: user.business_name || 'Mandi Terminal',
        mandiLocation: user.mandi_location || 'Kashmir Sabzi Mandi',
        mandi_location: user.mandi_location || 'Kashmir Sabzi Mandi',
        business: {
          id: user.business_id,
          name: user.business_name,
          city: user.business_city,
          mandiLocation: user.mandi_location,
          mandi_location: user.mandi_location,
        },
        message: 'Account is active. Enter your password to log in.',
      });
      return;
    }

    // If user is suspended/inactive
    if (user && (user.user_status === 'Inactive' || user.user_status === 'Suspended')) {
      res.status(200).json({
        success: true,
        status: 'SUSPENDED',
        message: 'Your employee account has been deactivated. Please contact your administrator.',
      });
      return;
    }

    // Check remaining invitation statuses
    if (invite) {
      if (invite.invite_status === 'Accepted') {
        res.status(200).json({
          success: true,
          status: 'PENDING_PASSWORD',
          name: invite.name,
          role: invite.role,
          businessId: invite.business_id,
          businessName: invite.business_name,
          mandiLocation: invite.mandi_location,
          message: 'Invitation accepted! Please create your password to activate your POS account.',
        });
        return;
      }

      if (invite.invite_status === 'Pending') {
        res.status(200).json({
          success: true,
          status: 'INVITATION_PENDING',
          name: invite.name,
          role: invite.role,
          businessName: invite.business_name,
          message: 'Invitation sent. Please open the link in your invitation email to accept it before setting up your password here.',
        });
        return;
      }
    }

    // Fallback if staged user
    if (user && user.user_status === 'Pending Password Creation') {
      res.status(200).json({
        success: true,
        status: 'PENDING_PASSWORD',
        name: user.name,
        role: user.role,
        businessId: user.business_id,
        businessName: user.business_name,
        message: 'Invitation accepted! Please create your password to activate your POS account.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 'NOT_FOUND',
      message: 'No active invitation found.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Activates employee account by creating password directly through POS terminal
 */
export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const { email, password, deviceId, deviceName } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    await client.query('BEGIN');

    // 1. Lock invitation row
    const inviteRes = await client.query(
      `
      SELECT i.id, i.business_id, i.email, i.name, i.role, i.status, i.expires_at,
             b.name AS business_name, b.city AS business_city, b.mandi_location, b.status AS business_status
      FROM invitations i
      LEFT JOIN businesses b ON i.business_id = b.id
      WHERE LOWER(TRIM(i.email)) = $1
      ORDER BY i.created_at DESC
      LIMIT 1
      FOR UPDATE OF i;
      `,
      [cleanEmail]
    );

    if (inviteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'No invitation found for this email address.' });
      return;
    }

    const invite = inviteRes.rows[0];

    if (invite.status === 'Activated') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Account is already activated. Please sign in directly.' });
      return;
    }

    if (invite.status === 'Cancelled') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'This invitation was revoked by your administrator.' });
      return;
    }

    if (invite.status === 'Pending') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Please click the "Accept Invitation" link in your email first before activating in POS.',
      });
      return;
    }

    if (invite.status !== 'Accepted') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: `Cannot activate invitation in "${invite.status}" status.` });
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      await client.query("UPDATE invitations SET status = 'Expired', updated_at = NOW() WHERE id = $1", [invite.id]);
      await client.query('COMMIT');
      res.status(400).json({ success: false, message: 'Invitation has expired.' });
      return;
    }

    if (invite.business_status && invite.business_status !== 'Active') {
      await client.query('ROLLBACK');
      res.status(403).json({ success: false, message: 'Your business merchant account is suspended.' });
      return;
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password.trim(), 10);

    // 2. Insert or update users table
    const tempUserId = `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const userRes = await client.query(
      `
      INSERT INTO users (
        id, business_id, name, email, password_hash, role, status,
        last_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Active', NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        business_id = EXCLUDED.business_id,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = 'Active',
        last_active = NOW(),
        updated_at = NOW()
      RETURNING id, name, email, role, business_id;
      `,
      [tempUserId, invite.business_id, invite.name, cleanEmail, passwordHash, invite.role]
    );

    const user = userRes.rows[0];

    // 3. Mark invitation as Activated
    await client.query(
      `UPDATE invitations SET status = 'Activated', activated_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    // 4. Optional device registration
    if (deviceId && typeof deviceId === 'string') {
      const finalDeviceName = deviceName || `${user.name} - ${invite.role} Terminal`;
      await client.query(
        `
        INSERT INTO devices (id, device_id, business_id, name, counter_name, status, last_sync, created_at, updated_at)
        VALUES ($1, $1, $2, $3, 'Counter 1', 'Active', NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          business_id = EXCLUDED.business_id,
          name = EXCLUDED.name,
          status = 'Active',
          last_sync = NOW(),
          updated_at = NOW();
        `,
        [deviceId, invite.business_id, finalDeviceName]
      );
    }

    await client.query('COMMIT');

    // Audit log
    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'POS Account Activated',
      targetEntity: 'User',
      targetId: user.id,
      businessId: user.business_id,
      businessName: invite.business_name,
      details: `Employee ${user.name} (${user.email}) created POS password and activated account for role ${user.role}.`,
      category: 'Security',
      ipAddress: req.ip,
    });

    // Notification to Customer Admin
    await createNotification({
      recipientRole: 'CUSTOMER_ADMIN',
      businessId: user.business_id,
      title: 'POS Employee Activated',
      message: `${user.name} (${user.role}) has activated their account on the POS terminal.`,
      type: 'success',
    });

    // Issue JWT token
    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.business_id,
      businessName: invite.business_name,
    };
    const jwtToken = jwt.sign(tokenPayload, authConfig.jwtSecret, { expiresIn: '90d' });

    res.status(200).json({
      success: true,
      message: 'Account activated successfully. Logged into POS terminal.',
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: invite.business_name,
      },
      business: {
        id: invite.business_id,
        name: invite.business_name,
        city: invite.business_city,
        mandiLocation: invite.mandi_location,
      },
      permissions: await getBusinessRolePermissions(invite.business_id, user.role),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Authenticates active POS employee
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const userRes = await pool.query(
      `
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, u.business_id,
             b.name AS business_name, b.city AS business_city, b.mandi_location, b.status AS business_status
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE LOWER(TRIM(u.email)) = $1
      LIMIT 1;
      `,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const user = userRes.rows[0];

    if (user.status === 'Pending Password Creation') {
      res.status(403).json({
        success: false,
        message: 'Account not yet activated. Please create your password first.',
      });
      return;
    }

    if (user.status !== 'Active') {
      res.status(403).json({
        success: false,
        message: 'Your employee account is deactivated. Please contact your administrator.',
      });
      return;
    }

    if (user.business_status && user.business_status !== 'Active') {
      res.status(403).json({
        success: false,
        message: 'Business merchant account is suspended.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password_hash.trim());
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Update last_active
    await pool.query('UPDATE users SET last_active = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);

    if (deviceId) {
      await pool.query('UPDATE devices SET last_sync = NOW() WHERE id = $1', [deviceId]);
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.business_id,
      businessName: user.business_name,
    };
    const jwtToken = jwt.sign(tokenPayload, authConfig.jwtSecret, { expiresIn: '90d' });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: user.business_name,
        mandiLocation: user.mandi_location,
        mandi_location: user.mandi_location,
      },
      business: {
        id: user.business_id,
        name: user.business_name,
        city: user.business_city,
        mandiLocation: user.mandi_location,
        mandi_location: user.mandi_location,
      },
      permissions: await getBusinessRolePermissions(user.business_id, user.role),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Downloads business profile and role permissions for local POS SQLite caching
 */
export async function getPosSyncData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      res.status(403).json({ success: false, message: 'No business context found in token.' });
      return;
    }

    const bizRes = await pool.query(
      `SELECT id, name, owner_name, email, phone, city, mandi_location, status, created_at FROM businesses WHERE id = $1`,
      [businessId]
    );

    if (bizRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    const business = bizRes.rows[0];

    res.status(200).json({
      success: true,
      business,
      user: {
        id: req.user?.id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      permissions: await getBusinessRolePermissions(businessId, req.user?.role || ''),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
