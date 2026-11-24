import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { businessId } = req.query;
    const callerRole = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.business_id AS "businessId",
        COALESCE(b.name, 'Platform Super Admin') AS "businessName",
        COALESCE(u.created_by_name, 
          CASE 
            WHEN u.role = 'SUPER_ADMIN' THEN 'Platform System'
            WHEN u.role = 'CUSTOMER_ADMIN' THEN 'Super Admin'
            ELSE COALESCE(b.name || ' – Customer Admin', 'Customer Admin')
          END
        ) AS "createdBy",
        u.created_by_role AS "createdByRole",
        TO_CHAR(u.created_at, 'YYYY-MM-DD') AS "dateAdded",
        TO_CHAR(u.last_active, 'YYYY-MM-DD HH24:MI') AS "lastActive"
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
    `;

    const params: any[] = [];

    // Business isolation enforcement
    if (callerRole === 'CUSTOMER_ADMIN' || callerRole === 'EMPLOYEE' || callerRole === 'MANAGER' || callerRole === 'CASHIER' || callerRole === 'ACCOUNTANT') {
      if (!callerBusinessId) {
        res.status(403).json({ success: false, message: 'Forbidden: Missing business context.' });
        return;
      }
      query += ` WHERE u.business_id = $1`;
      params.push(callerBusinessId);
    } else if (businessId && typeof businessId === 'string' && businessId !== 'ALL') {
      query += ` WHERE u.business_id = $1`;
      params.push(businessId);
    }

    query += ` ORDER BY u.created_at DESC;`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const { name, phone, role, status } = req.body;
    const callerRole = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    // Check existing user
    const checkRes = await pool.query('SELECT id, business_id, role, name, email FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const targetUser = checkRes.rows[0];

    // Business isolation check
    if (callerRole === 'CUSTOMER_ADMIN') {
      if (!callerBusinessId || targetUser.business_id !== callerBusinessId) {
        res.status(403).json({ success: false, message: 'Forbidden: You can only modify employees of your own business.' });
        return;
      }
      if (role && role.toUpperCase() === 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Forbidden: Cannot assign Super Admin role.' });
        return;
      }
    }

    let sanitizedRole = role;
    if (role) {
      const norm = role.trim().toUpperCase();
      if (norm === 'ADMIN' || norm === 'CUSTOMER_ADMIN') {
        sanitizedRole = 'Admin';
      } else if (norm !== 'SUPER_ADMIN') {
        sanitizedRole = 'Employee';
      }
    }

    const updateRes = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        role = COALESCE($3, role),
        status = COALESCE($4, status),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, phone, role, status, business_id;
      `,
      [name, phone, sanitizedRole, status, id]
    );

    const updated = updateRes.rows[0];

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: 'User Updated',
      targetEntity: 'User',
      targetId: id,
      businessId: updated.business_id,
      details: `Updated information for employee ${updated.name} (${updated.email}, role: ${updated.role}).`,
      category: 'User',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const callerRole = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    const checkRes = await pool.query('SELECT id, business_id, role, status, name, email FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const targetUser = checkRes.rows[0];

    if (callerRole === 'CUSTOMER_ADMIN') {
      if (!callerBusinessId || targetUser.business_id !== callerBusinessId) {
        res.status(403).json({ success: false, message: 'Forbidden: Cannot modify users of another business.' });
        return;
      }
      if (targetUser.role === 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Forbidden: Cannot modify Super Admin status.' });
        return;
      }
    }

    const newStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';
    await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: newStatus === 'Active' ? 'User Activated' : 'User Deactivated',
      targetEntity: 'User',
      targetId: id,
      businessId: targetUser.business_id,
      details: `Set account status to ${newStatus} for user ${targetUser.name} (${targetUser.email}).`,
      category: 'User',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientId: targetUser.id,
      businessId: targetUser.business_id,
      title: `Account ${newStatus}`,
      message: `Your staff account has been set to ${newStatus}.`,
      type: newStatus === 'Active' ? 'success' : 'warning',
    });

    res.status(200).json({
      success: true,
      status: newStatus,
      message: `User is now ${newStatus}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerUserId = req.user?.id || '';
    const callerBusinessId = req.user?.businessId || '';

    if (callerUserId === id) {
      res.status(400).json({ success: false, message: 'You cannot remove your own active user account.' });
      return;
    }

    const checkRes = await pool.query('SELECT id, business_id, role, name, email FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const targetUser = checkRes.rows[0];

    if (callerRole !== 'SUPER_ADMIN') {
      if (callerRole !== 'CUSTOMER_ADMIN' || !callerBusinessId || targetUser.business_id !== callerBusinessId) {
        res.status(403).json({ success: false, message: 'Forbidden: You can only remove employees from your own business.' });
        return;
      }
      if (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'CUSTOMER_ADMIN') {
        res.status(403).json({ success: false, message: 'Forbidden: Customer Admin cannot delete admin accounts.' });
        return;
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'CUSTOMER_ADMIN',
      action: 'User Removed',
      targetEntity: 'User',
      targetId: id,
      businessId: targetUser.business_id,
      details: `Removed user account ${targetUser.name} (${targetUser.email}, role: ${targetUser.role}).`,
      category: 'User',
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: `User "${targetUser.name}" removed successfully.` });
  } catch (error) {
    next(error);
  }
}
