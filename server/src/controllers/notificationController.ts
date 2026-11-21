import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerUserId = req.user?.id || '';
    const callerBusinessId = req.user?.businessId || '';

    let query = '';
    const params: any[] = [];

    if (callerRole === 'SUPER_ADMIN') {
      query = `
        SELECT 
          id, recipient_id AS "recipientId", recipient_role AS "recipientRole",
          business_id AS "businessId", title, message, type, is_read AS "isRead",
          created_at AS "createdAt"
        FROM notifications
        WHERE recipient_role = 'SUPER_ADMIN' OR recipient_id = $1 OR (recipient_role IS NULL AND business_id IS NULL)
        ORDER BY created_at DESC
        LIMIT 50;
      `;
      params.push(callerUserId);
    } else {
      query = `
        SELECT 
          id, recipient_id AS "recipientId", recipient_role AS "recipientRole",
          business_id AS "businessId", title, message, type, is_read AS "isRead",
          created_at AS "createdAt"
        FROM notifications
        WHERE (business_id = $1 AND (recipient_role = 'CUSTOMER_ADMIN' OR recipient_role IS NULL))
           OR recipient_id = $2
        ORDER BY created_at DESC
        LIMIT 50;
      `;
      params.push(callerBusinessId, callerUserId);
    }

    const result = await pool.query(query, params);
    const unreadCount = result.rows.filter((n: any) => !n.isRead).length;

    res.status(200).json({
      success: true,
      notifications: result.rows,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerUserId = req.user?.id || '';
    const callerBusinessId = req.user?.businessId || '';

    if (callerRole === 'SUPER_ADMIN') {
      await pool.query(
        `UPDATE notifications SET is_read = true 
         WHERE recipient_role = 'SUPER_ADMIN' OR recipient_id = $1 OR (recipient_role IS NULL AND business_id IS NULL)`,
        [callerUserId]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = true 
         WHERE (business_id = $1 AND (recipient_role = 'CUSTOMER_ADMIN' OR recipient_role IS NULL))
            OR recipient_id = $2`,
        [callerBusinessId, callerUserId]
      );
    }

    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.status(200).json({ success: true, message: 'Notification dismissed.' });
  } catch (error) {
    next(error);
  }
}
