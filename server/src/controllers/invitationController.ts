import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { sendInvitationEmail } from '../services/emailService.js';
import { recordAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

import { authConfig, serverConfig, corsConfig } from '../config/appConfig.js';

export function isClientAdminRole(role?: string): boolean {
  if (!role) return false;
  const norm = role.trim().toUpperCase();
  return norm === 'ADMIN' || norm === 'CUSTOMER_ADMIN' || norm === 'CLIENT_ADMIN' || norm === 'CLIENT ADMIN';
}

export function isSuperAdminRole(role?: string): boolean {
  if (!role) return false;
  const norm = role.trim().toUpperCase();
  return norm === 'SUPER_ADMIN' || norm === 'SUPERADMIN' || norm === 'SUPER ADMIN';
}

export function isEmployeeRole(role?: string): boolean {
  if (!role) return false;
  return !isClientAdminRole(role) && !isSuperAdminRole(role);
}

export function normalizeAssignedRole(rawRole: string): string {
  if (isSuperAdminRole(rawRole)) {
    return 'SUPER_ADMIN';
  }
  if (isClientAdminRole(rawRole)) {
    return 'CUSTOMER_ADMIN';
  }
  return 'Employee';
}

export async function sendInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const { 
      businessId, 
      email, 
      name, 
      role = 'Employee', 
      invitedById, 
      invitedByName, 
      invitedByRole 
    } = req.body;

    const normalizedRole = normalizeAssignedRole(role);

    const callerRole = req.user?.role || (req.headers['x-user-role'] as string) || '';
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    if (!businessId) {
      res.status(400).json({ success: false, message: 'businessId is required.' });
      return;
    }

    // Role-based business isolation check: Customer Admin cannot invite for another business
    if (callerRole === 'CUSTOMER_ADMIN' && callerBusinessId && callerBusinessId !== businessId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only invite employees to your own business.',
      });
      return;
    }

    // Customer Admin cannot create another Super Admin
    if (callerRole === 'CUSTOMER_ADMIN' && role.toUpperCase() === 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Customer Admins cannot assign Super Admin role.',
      });
      return;
    }

    // Lookup business
    const bizRes = await client.query('SELECT id, name, owner_name, email FROM businesses WHERE id = $1', [businessId]);
    if (bizRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    const business = bizRes.rows[0];
    const targetEmail = (email || business.email).trim().toLowerCase();
    const targetName = (name || business.owner_name).trim();

    // Check if user already belongs to another business
    const existingUserRes = await client.query(
      'SELECT id, business_id, role, status FROM users WHERE LOWER(TRIM(email)) = $1',
      [targetEmail]
    );
    if (existingUserRes.rows.length > 0 && existingUserRes.rows[0].business_id && existingUserRes.rows[0].business_id !== businessId) {
      res.status(400).json({
        success: false,
        message: `Email "${targetEmail}" is already registered to another Mandi merchant account.`,
      });
      return;
    }

    // Determine inviter attribution
    const finalInvitedByName =
      invitedByName ||
      (callerRole === 'SUPER_ADMIN' ? 'Super Admin' : `${business.name} – Customer Admin`);
    const finalInvitedByRole = invitedByRole || (callerRole || 'CUSTOMER_ADMIN');

    await client.query('BEGIN');

    // Cancel any previous pending invitations for this email + business
    await client.query(
      `UPDATE invitations SET status = 'Cancelled', updated_at = NOW() WHERE business_id = $1 AND email = $2 AND status = 'Pending'`,
      [businessId, targetEmail]
    );

    // If this is an employee role (Cashier, Manager, Accountant), stage the user in users table as 'Pending Password Creation'
    if (isEmployeeRole(normalizedRole)) {
      const tempUserId = `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
      const stageUserSql = `
        INSERT INTO users (
          id, business_id, name, email, password_hash, role, status,
          created_by_id, created_by_name, created_by_role, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, '$2a$10$LOCKED_PENDING_ACTIVATION', $5, 'Pending Password Creation', $6, $7, $8, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          business_id = EXCLUDED.business_id,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          status = CASE WHEN users.status = 'Active' THEN 'Active' ELSE 'Pending Password Creation' END,
          created_by_id = COALESCE(users.created_by_id, EXCLUDED.created_by_id),
          created_by_name = COALESCE(users.created_by_name, EXCLUDED.created_by_name),
          created_by_role = COALESCE(users.created_by_role, EXCLUDED.created_by_role),
          updated_at = NOW();
      `;
      await client.query(stageUserSql, [
        tempUserId,
        businessId,
        targetName,
        targetEmail,
        normalizedRole,
        invitedById || null,
        finalInvitedByName,
        finalInvitedByRole,
      ]);
    }

    // Generate new secure 64-character token
    const token = crypto.randomBytes(32).toString('hex');
    const invitationId = `inv-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const frontendUrl = originHeader || corsConfig.frontendUrl || 'https://pos.sudoleads.com';
    const inviteUrl = `${frontendUrl}/?token=${token}`;

    // Dispatch real email via Brevo SMTP
    const emailResult = await sendInvitationEmail({
      toEmail: targetEmail,
      recipientName: targetName,
      businessName: business.name,
      invitationUrl: inviteUrl,
      expiresAt,
      role: normalizedRole,
      invitedByName: finalInvitedByName,
    });

    const insertSql = `
      INSERT INTO invitations (
        id, business_id, email, name, role, token, status, expires_at,
        invited_by_id, invited_by_name, invited_by_role, email_sent, email_error
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9, $10, $11, $12)
      RETURNING id, business_id, email, name, role, token, status, expires_at,
        invited_by_name, email_sent, created_at;
    `;

    const result = await client.query(insertSql, [
      invitationId,
      businessId,
      targetEmail,
      targetName,
      normalizedRole,
      token,
      expiresAt,
      invitedById || null,
      finalInvitedByName,
      finalInvitedByRole,
      emailResult.sent,
      emailResult.sent ? null : emailResult.message,
    ]);

    await client.query('COMMIT');

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || finalInvitedByName,
      actorRole: req.user?.role || finalInvitedByRole,
      action: 'Invitation Sent',
      targetEntity: 'Invitation',
      targetId: invitationId,
      businessId,
      businessName: business.name,
      details: `Issued invitation to ${targetName} (${targetEmail}) for role ${normalizedRole}.`,
      category: 'Invitation',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientRole: 'CUSTOMER_ADMIN',
      businessId,
      title: 'Staff Invitation Issued',
      message: `An invitation token was issued for ${targetName} (${normalizedRole}).`,
      type: 'info',
    });

    res.status(200).json({
      success: true,
      message: emailResult.sent
        ? `Invitation successfully sent to ${targetEmail}.`
        : `Invitation created. ${emailResult.message}`,
      invitation: {
        ...result.rows[0],
        inviteUrl,
      },
      emailStatus: emailResult,
      inviteUrl,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function getInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { businessId } = req.query;
    const callerRole = req.user?.role || (req.headers['x-user-role'] as string) || '';
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    let query = `
      SELECT 
        i.id,
        i.business_id AS "businessId",
        b.name AS "businessName",
        i.name,
        i.email,
        i.role,
        i.token,
        i.status,
        TO_CHAR(i.created_at, 'YYYY-MM-DD') AS "invitationDate",
        TO_CHAR(i.expires_at, 'YYYY-MM-DD') AS "expiryDate",
        i.accepted_at AS "acceptedAt",
        i.activated_at AS "activatedAt",
        i.invited_by_name AS "invitedBy",
        i.email_sent AS "emailSent",
        i.email_error AS "emailError"
      FROM invitations i
      LEFT JOIN businesses b ON i.business_id = b.id
    `;

    const params: any[] = [];

    // Business isolation: Customer Admin can ONLY view their own invitations
    if (callerRole === 'CUSTOMER_ADMIN' || callerRole === 'MANAGER') {
      if (!callerBusinessId) {
        res.status(403).json({ success: false, message: 'Forbidden: Missing business authorization.' });
        return;
      }
      query += ` WHERE i.business_id = $1`;
      params.push(callerBusinessId);
    } else if (businessId && typeof businessId === 'string' && businessId !== 'ALL') {
      query += ` WHERE i.business_id = $1`;
      params.push(businessId);
    }

    query += ` ORDER BY i.created_at DESC;`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      invitations: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const callerRole = req.user?.role || (req.headers['x-user-role'] as string) || '';
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    const checkRes = await pool.query('SELECT id, business_id, email, status FROM invitations WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Invitation not found.' });
      return;
    }

    const invitation = checkRes.rows[0];

    // Business isolation check
    if (callerRole === 'CUSTOMER_ADMIN' && callerBusinessId && invitation.business_id !== callerBusinessId) {
      res.status(403).json({ success: false, message: 'Forbidden: Cannot cancel invitations of other businesses.' });
      return;
    }

    if (invitation.status === 'Activated') {
      res.status(400).json({ success: false, message: 'Cannot cancel an activated employee account. Use Staff Directory to deactivate this user.' });
      return;
    }

    await pool.query(
      `UPDATE invitations SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // If there is a staged user pending password creation, deactivate them
    if (invitation.email) {
      await pool.query(
        `UPDATE users SET status = 'Inactive', updated_at = NOW() WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND status = 'Pending Password Creation'`,
        [invitation.email]
      );
    }

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'CUSTOMER_ADMIN',
      action: 'Invitation Cancelled',
      targetEntity: 'Invitation',
      targetId: id,
      businessId: invitation.business_id,
      details: `Revoked pending invitation token for ID ${id}.`,
      category: 'Invitation',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ valid: false, message: 'Invitation token is required.' });
      return;
    }

    const result = await pool.query(
      `
      SELECT 
        i.id,
        i.business_id,
        b.name AS business_name,
        b.city AS business_city,
        b.mandi_location,
        i.email,
        i.name,
        i.role,
        i.status,
        i.expires_at,
        i.invited_by_name
      FROM invitations i
      LEFT JOIN businesses b ON i.business_id = b.id
      WHERE i.token = $1
      LIMIT 1;
      `,
      [token.trim()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        valid: false,
        status: 'invalid',
        message: 'Invalid invitation token.',
      });
      return;
    }

    const invite = result.rows[0];
    const isClientAdmin = isClientAdminRole(invite.role);
    const isEmployee = isEmployeeRole(invite.role);

    if (invite.status === 'Accepted') {
      if (isClientAdmin) {
        // Resilient check: did this Client Admin actually set a password in users?
        // If the previous buggy flow accepted their invite as an employee, they might still lack a real password.
        const userCheck = await pool.query(
          'SELECT id, password_hash, status FROM users WHERE LOWER(TRIM(email)) = $1',
          [invite.email.trim().toLowerCase()]
        );
        const existingUser = userCheck.rows[0];
        const hasValidPassword =
          existingUser &&
          existingUser.password_hash &&
          !existingUser.password_hash.includes('LOCKED_PENDING_ACTIVATION');

        if (!existingUser || !hasValidPassword || existingUser.status !== 'Active') {
          // Allow them to set password on the web
          res.status(200).json({
            valid: true,
            invitation: {
              id: invite.id,
              businessId: invite.business_id,
              businessName: invite.business_name,
              businessCity: invite.business_city,
              mandiLocation: invite.mandi_location,
              email: invite.email,
              name: invite.name,
              role: 'CUSTOMER_ADMIN',
              isEmployee: false,
              isAdmin: true,
              invitedByName: invite.invited_by_name,
              expiresAt: invite.expires_at,
            },
            recovered: true,
          });
          return;
        }

        res.status(200).json({
          valid: false,
          status: 'accepted',
          message: 'This invitation has already been accepted. Please sign in.',
        });
        return;
      }

      res.status(200).json({
        valid: false,
        status: 'already_accepted',
        isEmployee: true,
        role: invite.role,
        businessName: invite.business_name,
        email: invite.email,
        name: invite.name,
        message: 'Your invitation has already been accepted. Please open the Vegetable POS application installed on your computer to create your password and activate your account.',
      });
      return;
    }

    if (invite.status === 'Activated') {
      res.status(200).json({
        valid: false,
        status: 'already_activated',
        isEmployee: isEmployee,
        message: isEmployee
          ? 'Your account is already active. Please open the Vegetable POS application to log in.'
          : 'Your account is already active. Please sign in.',
      });
      return;
    }

    if (invite.status === 'Cancelled') {
      res.status(200).json({
        valid: false,
        status: 'cancelled',
        message: 'This invitation has been cancelled by an administrator.',
      });
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      await pool.query("UPDATE invitations SET status = 'Expired', updated_at = NOW() WHERE id = $1", [invite.id]);
      res.status(200).json({
        valid: false,
        status: 'expired',
        message: 'This invitation has expired. Please contact your administrator for a new invite.',
      });
      return;
    }

    res.status(200).json({
      valid: true,
      invitation: {
        id: invite.id,
        businessId: invite.business_id,
        businessName: invite.business_name,
        businessCity: invite.business_city,
        mandiLocation: invite.mandi_location,
        email: invite.email,
        name: invite.name,
        role: isClientAdmin ? 'CUSTOMER_ADMIN' : 'Employee',
        isEmployee: isEmployee,
        isAdmin: isClientAdmin,
        invitedByName: invite.invited_by_name,
        expiresAt: invite.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, message: 'Invitation token is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }

    await client.query('BEGIN');

    // Lock invitation row for update
    const inviteRes = await client.query(
      `
      SELECT id, business_id, email, name, role, status, expires_at,
             invited_by_id, invited_by_name, invited_by_role
      FROM invitations
      WHERE token = $1
      FOR UPDATE;
      `,
      [token.trim()]
    );

    if (inviteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Invalid invitation token.' });
      return;
    }

    const invite = inviteRes.rows[0];
    const isClientAdmin = isClientAdminRole(invite.role);
    const isEmployee = isEmployeeRole(invite.role);

    // Security check: Employees cannot accept or create passwords via the web dashboard
    if (isEmployee) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Employees must accept invitations and create their password through the installed Vegetable POS application.',
      });
      return;
    }

    if (invite.status === 'Accepted') {
      // Check if user already has an active account with real password
      const userCheck = await client.query(
        'SELECT id, password_hash, status FROM users WHERE LOWER(TRIM(email)) = $1',
        [invite.email.trim().toLowerCase()]
      );
      const existingUser = userCheck.rows[0];
      const hasValidPassword =
        existingUser &&
        existingUser.password_hash &&
        !existingUser.password_hash.includes('LOCKED_PENDING_ACTIVATION');

      if (hasValidPassword && existingUser.status === 'Active') {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: 'This invitation has already been accepted. Please sign in.' });
        return;
      }
      // If user has no valid password yet (recovering from previous flow bug), proceed with password setup
    }

    if (invite.status === 'Activated') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'This invitation has already been activated. Please sign in.' });
      return;
    }

    if (invite.status === 'Cancelled') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'This invitation has been revoked by an administrator.' });
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      await client.query("UPDATE invitations SET status = 'Expired', updated_at = NOW() WHERE id = $1", [invite.id]);
      await client.query('COMMIT');
      res.status(400).json({ success: false, message: 'This invitation has expired.' });
      return;
    }

    // Hash the password with bcrypt
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const userId = `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const cleanEmail = invite.email.trim().toLowerCase();

    const createdByName = invite.invited_by_name || 'Super Admin';
    const createdByRole = invite.invited_by_role || 'SUPER_ADMIN';

    // Insert or update the user record linked to this business
    const userInsertSql = `
      INSERT INTO users (
        id, business_id, name, email, password_hash, role, status,
        created_by_id, created_by_name, created_by_role, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        business_id = EXCLUDED.business_id,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = 'Active',
        created_by_id = COALESCE(users.created_by_id, EXCLUDED.created_by_id),
        created_by_name = COALESCE(users.created_by_name, EXCLUDED.created_by_name),
        created_by_role = COALESCE(users.created_by_role, EXCLUDED.created_by_role),
        updated_at = NOW()
      RETURNING id, name, email, role, business_id, created_by_name;
    `;

    const userResult = await client.query(userInsertSql, [
      userId,
      invite.business_id,
      invite.name.trim(),
      cleanEmail,
      passwordHash,
      normalizeAssignedRole(invite.role || 'CUSTOMER_ADMIN'),
      invite.invited_by_id || null,
      createdByName,
      createdByRole,
    ]);

    // Mark invitation as Accepted
    await client.query(
      `UPDATE invitations SET status = 'Accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    // Ensure business is Active
    await client.query(
      `UPDATE businesses SET status = 'Active', updated_at = NOW() WHERE id = $1`,
      [invite.business_id]
    );

    // Fetch business name for JWT token
    const bizQuery = await client.query('SELECT name FROM businesses WHERE id = $1', [invite.business_id]);
    const businessName = bizQuery.rows[0]?.name || 'Mandi Business';

    await client.query('COMMIT');

    const createdUser = userResult.rows[0];
    console.log(`[Invitation Service]: User "${createdUser.email}" (${createdUser.role}) successfully activated for business "${invite.business_id}".`);

    await recordAuditLog({
      actorId: createdUser.id,
      actorName: createdUser.name,
      actorRole: createdUser.role,
      action: 'Invitation Accepted',
      targetEntity: 'Invitation',
      targetId: invite.id,
      businessId: invite.business_id,
      businessName: businessName,
      details: `User ${createdUser.name} (${createdUser.email}) accepted invitation and activated their ${createdUser.role} account.`,
      category: 'Invitation',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientRole: 'CUSTOMER_ADMIN',
      businessId: invite.business_id,
      title: 'Invitation Accepted',
      message: `${createdUser.name} has joined as ${createdUser.role}.`,
      type: 'success',
    });

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      businessId: invite.business_id,
      title: 'User Invitation Accepted',
      message: `${createdUser.name} activated account in "${businessName}".`,
      type: 'info',
    });

    // Generate signed JWT token so user can authenticate immediately
    const tokenPayload = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      businessId: createdUser.business_id,
      businessName: businessName,
    };

    const jwtToken = jwt.sign(tokenPayload, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpiresIn as any });

    res.status(200).json({
      success: true,
      message: 'Account activated successfully. You can now log in to the portal.',
      token: jwtToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role,
        businessId: createdUser.business_id,
        businessName: businessName,
        createdByName: createdUser.created_by_name,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function acceptEmployeeInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, message: 'Invitation token is required.' });
      return;
    }

    await client.query('BEGIN');

    const inviteRes = await client.query(
      `
      SELECT i.id, i.business_id, b.name AS business_name, b.city AS business_city, b.mandi_location,
             i.email, i.name, i.role, i.status, i.expires_at,
             i.invited_by_id, i.invited_by_name, i.invited_by_role
      FROM invitations i
      LEFT JOIN businesses b ON i.business_id = b.id
      WHERE i.token = $1
      FOR UPDATE OF i;
      `,
      [token.trim()]
    );

    if (inviteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Invalid invitation token.' });
      return;
    }

    const invite = inviteRes.rows[0];

    // Check if already accepted
    if (invite.status === 'Accepted') {
      await client.query('COMMIT');
      res.status(200).json({
        success: true,
        alreadyAccepted: true,
        message: 'Your invitation has been accepted. Now open the Vegetable POS application installed on your computer, enter your invited email address, and create your password to activate your account.',
        employee: {
          id: invite.id,
          email: invite.email,
          name: invite.name,
          role: invite.role,
          businessId: invite.business_id,
          businessName: invite.business_name,
          mandiLocation: invite.mandi_location,
        },
      });
      return;
    }

    if (invite.status === 'Activated') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'This invitation has already been activated on the POS terminal. Please log into the Vegetable POS application.',
      });
      return;
    }

    if (invite.status === 'Cancelled') {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'This invitation has been revoked by an administrator.',
      });
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      await client.query("UPDATE invitations SET status = 'Expired', updated_at = NOW() WHERE id = $1", [invite.id]);
      await client.query('COMMIT');
      res.status(400).json({ success: false, message: 'This invitation has expired.' });
      return;
    }

    // Role check: this endpoint is exclusively for employees
    if (isClientAdminRole(invite.role) || isSuperAdminRole(invite.role)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Customer Admin owners must set up their password on the web portal.',
      });
      return;
    }

    // Transition invitation to 'Accepted'
    await client.query(
      `UPDATE invitations SET status = 'Accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    // Ensure user record is staged as 'Pending Password Creation'
    const tempUserId = `usr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    await client.query(
      `
      INSERT INTO users (
        id, business_id, name, email, password_hash, role, status,
        created_by_id, created_by_name, created_by_role, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, '$2a$10$LOCKED_PENDING_ACTIVATION', $5, 'Pending Password Creation', $6, $7, $8, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        business_id = EXCLUDED.business_id,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        status = CASE WHEN users.status = 'Active' THEN 'Active' ELSE 'Pending Password Creation' END,
        updated_at = NOW();
      `,
      [
        tempUserId,
        invite.business_id,
        invite.name.trim(),
        invite.email.trim().toLowerCase(),
        normalizeAssignedRole(invite.role),
        invite.invited_by_id || null,
        invite.invited_by_name || 'Administrator',
        invite.invited_by_role || 'CUSTOMER_ADMIN',
      ]
    );

    await client.query('COMMIT');

    await recordAuditLog({
      actorId: undefined,
      actorName: invite.name,
      actorRole: invite.role,
      action: 'Employee Invitation Accepted',
      targetEntity: 'Invitation',
      targetId: invite.id,
      businessId: invite.business_id,
      businessName: invite.business_name,
      details: `Employee ${invite.name} (${invite.email}) accepted invitation for role ${invite.role}. POS password creation pending.`,
      category: 'Invitation',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientRole: 'CUSTOMER_ADMIN',
      businessId: invite.business_id,
      title: 'Employee Accepted Invitation',
      message: `${invite.name} (${invite.role}) accepted the invitation. Awaiting POS password creation.`,
      type: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Your invitation has been accepted. Now open the Vegetable POS application installed on your computer, enter your invited email address, and create your password to activate your account.',
      employee: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        businessId: invite.business_id,
        businessName: invite.business_name,
        mandiLocation: invite.mandi_location,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}
