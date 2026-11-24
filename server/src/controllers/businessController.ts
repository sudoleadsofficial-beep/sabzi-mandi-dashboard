import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendInvitationEmail } from '../services/emailService.js';
import { recordAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

export async function getBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { businessId } = req.query;
    const callerRole = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    let targetBusinessId = businessId;
    if (callerRole === 'CUSTOMER_ADMIN' || callerRole === 'EMPLOYEE' || callerRole === 'MANAGER' || callerRole === 'CASHIER' || callerRole === 'ACCOUNTANT') {
      if (!callerBusinessId) {
        res.status(403).json({ success: false, message: 'Forbidden: Missing business authorization.' });
        return;
      }
      targetBusinessId = callerBusinessId;
    }

    let query = `
      SELECT 
        b.id,
        b.name,
        b.owner_name AS "ownerName",
        b.email,
        b.phone,
        b.city,
        b.mandi_location AS "mandiLocation",
        b.address,
        b.status,
        b.settings,
        b.commission_rate AS "commissionRate",
        b.ntn,
        b.strn,
        b.established_year AS "establishedYear",
        b.total_counters AS "totalCounters",
        TO_CHAR(b.created_at, 'YYYY-MM-DD') AS "registrationDate",
        i.token AS "inviteToken",
        i.status AS "inviteStatus",
        i.expires_at AS "inviteExpiresAt",
        i.email_sent AS "inviteEmailSent",
        i.email_error AS "inviteEmailError"
      FROM businesses b
      LEFT JOIN LATERAL (
        SELECT token, status, expires_at, email_sent, email_error
        FROM invitations
        WHERE business_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) i ON true
    `;

    const params: any[] = [];
    if (targetBusinessId && typeof targetBusinessId === 'string' && targetBusinessId !== 'ALL') {
      query += ` WHERE b.id = $1`;
      params.push(targetBusinessId);
    }

    query += ` ORDER BY b.created_at DESC;`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      businesses: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function createBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const {
      name,
      ownerName,
      email,
      phone,
      city,
      mandiLocation,
      address,
      sendInvitation = true,
      initialAdminName,
      initialAdminEmail,
      commissionRate,
      ntn,
      strn,
      establishedYear,
    } = req.body;

    if (!name || !ownerName || !email) {
      res.status(400).json({
        success: false,
        message: 'Business name, owner name, and owner email are required.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetAdminEmail = (initialAdminEmail || cleanEmail).trim().toLowerCase();
    const targetAdminName = (initialAdminName || ownerName).trim();

    await client.query('BEGIN');

    const businessId = `biz-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

    const insertBusinessSql = `
      INSERT INTO businesses (
        id, name, owner_name, email, phone, city, mandi_location, address, 
        status, commission_rate, ntn, strn, established_year
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', $9, $10, $11, $12)
      RETURNING 
        id, 
        name, 
        owner_name AS "ownerName", 
        email, 
        phone, 
        city, 
        mandi_location AS "mandiLocation", 
        address, 
        status,
        commission_rate AS "commissionRate",
        ntn,
        strn,
        established_year AS "establishedYear",
        TO_CHAR(created_at, 'YYYY-MM-DD') AS "registrationDate";
    `;

    const bizResult = await client.query(insertBusinessSql, [
      businessId,
      name.trim(),
      ownerName.trim(),
      cleanEmail,
      phone ? phone.trim() : '+92 300 0000000',
      city ? city.trim() : 'Lahore',
      mandiLocation ? mandiLocation.trim() : `${city || 'Lahore'} Wholesale Mandi`,
      address ? address.trim() : `Platform Yard, ${city || 'Lahore'}`,
      commissionRate || '6.0% Mandi Standard',
      ntn || null,
      strn || null,
      establishedYear || '2024',
    ]);

    const createdBiz = bizResult.rows[0];
    let invitationData: any = null;
    let emailStatus: any = null;
    let inviteUrl = '';

    if (sendInvitation) {
      const token = crypto.randomBytes(32).toString('hex');
      const invitationId = `inv-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
      const frontendUrl = originHeader || process.env.FRONTEND_URL || 'http://localhost:5173';
      inviteUrl = `${frontendUrl}/?token=${token}`;

      const emailResult = await sendInvitationEmail({
        toEmail: targetAdminEmail,
        recipientName: targetAdminName,
        businessName: createdBiz.name,
        invitationUrl: inviteUrl,
        expiresAt,
        role: 'CUSTOMER_ADMIN',
        invitedByName: 'Super Admin',
      });

      emailStatus = emailResult;

      const insertInviteSql = `
        INSERT INTO invitations (
          id, business_id, email, name, role, token, status, expires_at,
          invited_by_id, invited_by_name, invited_by_role, email_sent, email_error
        )
        VALUES ($1, $2, $3, $4, 'CUSTOMER_ADMIN', $5, 'Pending', $6, $7, $8, $9, $10, $11)
        RETURNING id, token, status, expires_at, email_sent;
      `;

      const inviteResult = await client.query(insertInviteSql, [
        invitationId,
        businessId,
        targetAdminEmail,
        targetAdminName,
        token,
        expiresAt,
        req.user?.id || 'usr-superadmin',
        'Super Admin',
        'SUPER_ADMIN',
        emailResult.sent,
        emailResult.sent ? null : emailResult.message,
      ]);

      invitationData = {
        ...inviteResult.rows[0],
        inviteUrl,
      };
    }

    await client.query('COMMIT');

    // Audit and Notification
    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Super Admin',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: 'Business Created',
      targetEntity: 'Business',
      targetId: businessId,
      businessId,
      businessName: createdBiz.name,
      details: `Created business "${createdBiz.name}" for owner ${createdBiz.ownerName}.`,
      category: 'Business',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      businessId,
      title: 'New Mandi Business Onboarded',
      message: `"${createdBiz.name}" was registered by ${req.user?.name || 'Super Admin'}.`,
      type: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Business created successfully.',
      business: createdBiz,
      invitation: invitationData,
      emailStatus,
      inviteUrl,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function updateBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const { 
      name, 
      ownerName, 
      phone, 
      address, 
      status, 
      mandiLocation, 
      city,
      commissionRate,
      ntn,
      strn,
      establishedYear,
      totalCounters,
      settings
    } = req.body;
    const callerRole = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || (req.headers['x-user-business-id'] as string) || '';

    if (callerRole === 'CUSTOMER_ADMIN' && callerBusinessId !== id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify another business.',
      });
      return;
    }

    const result = await pool.query(
      `
      UPDATE businesses
      SET
        name = COALESCE($1, name),
        owner_name = COALESCE($2, owner_name),
        phone = COALESCE($3, phone),
        address = COALESCE($4, address),
        status = COALESCE($5, status),
        mandi_location = COALESCE($6, mandi_location),
        city = COALESCE($7, city),
        commission_rate = COALESCE($8, commission_rate),
        ntn = COALESCE($9, ntn),
        strn = COALESCE($10, strn),
        established_year = COALESCE($11, established_year),
        total_counters = COALESCE($12, total_counters),
        settings = CASE WHEN $13::jsonb IS NOT NULL THEN $13::jsonb ELSE settings END,
        updated_at = NOW()
      WHERE id = $14
      RETURNING 
        id, 
        name, 
        owner_name AS "ownerName", 
        email, 
        phone, 
        city, 
        mandi_location AS "mandiLocation", 
        address, 
        status,
        commission_rate AS "commissionRate",
        ntn,
        strn,
        established_year AS "establishedYear",
        total_counters AS "totalCounters",
        settings;
      `,
      [
        name, 
        ownerName, 
        phone, 
        address, 
        status, 
        mandiLocation, 
        city, 
        commissionRate, 
        ntn, 
        strn, 
        establishedYear, 
        totalCounters, 
        settings ? JSON.stringify(settings) : null, 
        id
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    const updatedBiz = result.rows[0];

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: status ? (status === 'Active' ? 'Business Activated' : 'Business Suspended') : 'Business Details Updated',
      targetEntity: 'Business',
      targetId: id,
      businessId: id,
      businessName: updatedBiz.name,
      details: status ? `Status changed to ${status} for ${updatedBiz.name}.` : `Updated details for ${updatedBiz.name}.`,
      category: 'Business',
      ipAddress: req.ip,
    });

    if (status) {
      await createNotification({
        recipientRole: 'CUSTOMER_ADMIN',
        businessId: id,
        title: `Business ${status}`,
        message: `Your business account has been marked as ${status}.`,
        type: status === 'Active' ? 'success' : 'warning',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Business updated successfully.',
      business: updatedBiz,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const id = String(req.params.id);
    const callerRole = (req.user?.role || '').trim().toUpperCase();

    if (callerRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'Forbidden: Super Admin access required to delete a business.' });
      return;
    }

    await client.query('BEGIN');

    // Get business name for logging
    const bizRes = await client.query('SELECT name FROM businesses WHERE id = $1', [id]);
    if (bizRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }
    const bizName = bizRes.rows[0].name;

    // Unlink users associated with this business
    await client.query('UPDATE users SET business_id = NULL WHERE business_id = $1', [id]);

    // Delete invitations, devices, sync_records, notifications associated with this business
    await client.query('DELETE FROM invitations WHERE business_id = $1', [id]);
    await client.query('DELETE FROM devices WHERE business_id = $1', [id]);
    await client.query('DELETE FROM sync_records WHERE business_id = $1', [id]);
    await client.query('DELETE FROM notifications WHERE business_id = $1', [id]);

    // Delete business
    await client.query('DELETE FROM businesses WHERE id = $1', [id]);

    await client.query('COMMIT');

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Super Admin',
      actorRole: 'SUPER_ADMIN',
      action: 'Business Deleted',
      targetEntity: 'Business',
      targetId: id,
      businessId: null,
      businessName: bizName,
      details: `Permanently removed business "${bizName}" (ID: ${id}) and unlinked its staff accounts.`,
      category: 'Business',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      title: 'Business Deleted',
      message: `Business "${bizName}" was removed from the platform.`,
      type: 'warning',
    });

    res.status(200).json({ success: true, message: `Business "${bizName}" deleted successfully.` });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function updateBusinessSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const settings = req.body;
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || '';

    if (callerRole === 'CUSTOMER_ADMIN' && callerBusinessId !== id) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot modify another business\'s settings.' });
      return;
    }

    const result = await pool.query(
      `UPDATE businesses SET settings = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, settings;`,
      [JSON.stringify(settings), id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'CUSTOMER_ADMIN',
      action: 'Settings Saved',
      targetEntity: 'Business Settings',
      targetId: id,
      businessId: id,
      businessName: result.rows[0].name,
      details: `Saved business configuration & operational parameters.`,
      category: 'Settings',
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Settings saved to database successfully.', settings: result.rows[0].settings });
  } catch (error) {
    next(error);
  }
}

const ALL_POS_FEATURE_IDS = [
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

const DEFAULT_EMPLOYEE_FEATURES = [
  'new_sale',
  'wasooli',
  'stock_management',
  'customers',
  'farmers',
  'merchant_khata',
  'farmer_khata',
];

export async function getBusinessPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || '';

    if (callerRole === 'CUSTOMER_ADMIN' && callerBusinessId !== id) {
      res.status(403).json({ success: false, message: "Forbidden: You cannot view another business's permissions." });
      return;
    }

    const result = await pool.query(`SELECT id, name, settings FROM businesses WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    const settings = result.rows[0].settings || {};
    let rolePermissions = settings.rolePermissions;

    if (!rolePermissions || !Array.isArray(rolePermissions)) {
      rolePermissions = [
        {
          id: 'role-admin',
          name: 'Admin',
          description: 'Full access to all POS features. Admin access is permanent and cannot be restricted.',
          isSystemRole: true,
          allowedFeatures: ALL_POS_FEATURE_IDS,
        },
        {
          id: 'role-employee',
          name: 'Employee',
          description: 'Access only to the features enabled by the Admin.',
          isSystemRole: false,
          allowedFeatures: DEFAULT_EMPLOYEE_FEATURES,
        },
      ];
    } else {
      // Ensure Admin always has full access
      rolePermissions = rolePermissions.map((r: any) => {
        if (r.id === 'role-admin' || (r.name && r.name.toLowerCase() === 'admin')) {
          return {
            ...r,
            isSystemRole: true,
            allowedFeatures: ALL_POS_FEATURE_IDS,
          };
        }
        return r;
      });
    }

    res.status(200).json({ success: true, rolePermissions });
  } catch (error) {
    next(error);
  }
}

export async function updateBusinessPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || '';

    if (callerRole === 'CUSTOMER_ADMIN' && callerBusinessId !== id) {
      res.status(403).json({ success: false, message: "Forbidden: You cannot modify another business's permissions." });
      return;
    }

    const { rolePermissions } = req.body;
    if (!rolePermissions || !Array.isArray(rolePermissions)) {
      res.status(400).json({ success: false, message: 'Invalid rolePermissions data.' });
      return;
    }

    // Enforce Admin role always retains full access to all features (cannot remove own access)
    const sanitizedRoles = rolePermissions.map((r: any) => {
      if (r.id === 'role-admin' || (r.name && r.name.toLowerCase() === 'admin')) {
        return {
          id: 'role-admin',
          name: 'Admin',
          description: 'Full access to all POS features. Admin access is permanent and cannot be restricted.',
          isSystemRole: true,
          allowedFeatures: ALL_POS_FEATURE_IDS,
        };
      }
      return {
        id: 'role-employee',
        name: 'Employee',
        description: 'Access only to the features enabled by the Admin.',
        isSystemRole: false,
        allowedFeatures: Array.isArray(r.allowedFeatures)
          ? r.allowedFeatures.filter((fId: string) => ALL_POS_FEATURE_IDS.includes(fId))
          : [],
      };
    });

    // Make sure both Admin and Employee exist
    if (!sanitizedRoles.some((r: any) => r.id === 'role-admin')) {
      sanitizedRoles.unshift({
        id: 'role-admin',
        name: 'Admin',
        description: 'Full access to all POS features. Admin access is permanent and cannot be restricted.',
        isSystemRole: true,
        allowedFeatures: ALL_POS_FEATURE_IDS,
      });
    }
    if (!sanitizedRoles.some((r: any) => r.id === 'role-employee')) {
      sanitizedRoles.push({
        id: 'role-employee',
        name: 'Employee',
        description: 'Access only to the features enabled by the Admin.',
        isSystemRole: false,
        allowedFeatures: DEFAULT_EMPLOYEE_FEATURES,
      });
    }

    // Update in database JSONB settings
    const result = await pool.query(
      `
      UPDATE businesses
      SET
        settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{rolePermissions}', $1::jsonb),
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, settings;
      `,
      [JSON.stringify(sanitizedRoles), id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'CUSTOMER_ADMIN',
      action: 'Role Permissions Updated',
      targetEntity: 'Roles & Permissions',
      targetId: id,
      businessId: id,
      businessName: result.rows[0].name,
      details: 'Updated Employee role POS feature access checklist.',
      category: 'Security',
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Role permissions saved to database successfully.',
      rolePermissions: sanitizedRoles,
      settings: result.rows[0].settings,
    });
  } catch (error) {
    next(error);
  }
}
