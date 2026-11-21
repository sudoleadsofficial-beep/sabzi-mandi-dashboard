import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pos-mandi-super-secret-jwt-key-2026-production';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, rememberMe } = req.body;

    // Basic payload validation
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log(`[Auth API] Login attempt received for: "${cleanEmail}"`);

    // Query user joined with business details
    const result = await pool.query(
      `
      SELECT 
        u.id, 
        u.business_id, 
        u.name, 
        u.email, 
        u.password_hash, 
        u.role, 
        u.status, 
        u.phone,
        b.name AS business_name, 
        b.city AS business_city
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE LOWER(TRIM(u.email)) = $1
      LIMIT 1;
      `,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      console.warn(`[Auth API] Authentication failed: User "${cleanEmail}" not found in database.`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const user = result.rows[0];

    // Check account status
    if (user.status !== 'Active') {
      console.warn(`[Auth API] Authentication rejected: Account "${cleanEmail}" is ${user.status}.`);
      res.status(403).json({
        success: false,
        message: 'Your account is deactivated or suspended. Please contact your administrator.',
      });
      return;
    }

    // Verify hashed password
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password_hash.trim());
    if (!isPasswordValid) {
      console.warn(`[Auth API] Authentication failed: Password mismatch for user "${cleanEmail}".`);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Role restriction: Web dashboard is exclusively for Super Admins and Customer Admins
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'CUSTOMER_ADMIN') {
      console.warn(`[Auth API] Web dashboard login rejected for employee role "${user.role}" ("${cleanEmail}"). POS terminal access only.`);
      res.status(403).json({
        success: false,
        message: 'Access restricted: The web dashboard is exclusively for Super Admins and Customer Admins. Employees must authenticate through the installed Vegetable POS application.',
      });
      return;
    }

    console.log(`[Auth API] Authentication successful for user "${cleanEmail}" (${user.role}).`);

    // Update last_active timestamp
    await pool.query(
      'UPDATE users SET last_active = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    const businessName = user.business_name || (user.role === 'SUPER_ADMIN' ? 'SudoLeads Platform' : 'Mandi Business');

    // Generate cryptographically signed JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: businessName,
      },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '24h' }
    );

    // Return authenticated user profile and token
    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: businessName,
        phone: user.phone,
        rememberMe: Boolean(rememberMe),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * Controller to verify current session/token (useful for initial load or page refresh)
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // If authenticated via JWT middleware
    const authHeader = req.headers.authorization;
    let userEmail: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userEmail = decoded.email;
      } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        return;
      }
    } else if (req.query.email && typeof req.query.email === 'string') {
      userEmail = req.query.email.trim().toLowerCase();
    }

    if (!userEmail) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const result = await pool.query(
      `
      SELECT 
        u.id, 
        u.business_id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.phone,
        b.name AS business_name,
        b.city AS business_city
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      WHERE LOWER(TRIM(u.email)) = $1
      LIMIT 1;
      `,
      [userEmail.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const user = result.rows[0];

    if (user.status !== 'Active') {
      res.status(403).json({ success: false, message: 'Account is not active.' });
      return;
    }

    const businessName = user.business_name || (user.role === 'SUPER_ADMIN' ? 'SudoLeads Platform' : 'Mandi Business');

    // Fresh token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: businessName,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: businessName,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!currentPassword || !newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const checkRes = await pool.query('SELECT id, password_hash, name, email, role, business_id FROM users WHERE id = $1', [userId]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const user = checkRes.rows[0];
    const isCurrentValid = await bcrypt.compare(currentPassword.trim(), user.password_hash.trim());
    if (!isCurrentValid) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'Password Changed',
      targetEntity: 'User',
      targetId: user.id,
      businessId: user.business_id,
      details: `User ${user.name} (${user.email}) changed their password successfully.`,
      category: 'Security',
      ipAddress: req.ip,
    });

    await createNotification({
      recipientId: user.id,
      businessId: user.business_id,
      title: 'Security Alert: Password Updated',
      message: 'Your account password was successfully updated.',
      type: 'info',
    });

    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const { name, phone } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, name, email, phone, role, business_id;`,
      [name?.trim() || null, phone?.trim() || null, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const updated = result.rows[0];

    await recordAuditLog({
      actorId: updated.id,
      actorName: updated.name,
      actorRole: updated.role,
      action: 'Profile Updated',
      targetEntity: 'User Profile',
      targetId: updated.id,
      businessId: updated.business_id,
      details: `Updated personal contact details for ${updated.name}.`,
      category: 'User',
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Profile updated successfully.', user: updated });
  } catch (error) {
    next(error);
  }
}
