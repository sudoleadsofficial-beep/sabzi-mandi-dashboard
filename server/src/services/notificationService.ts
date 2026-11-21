import crypto from 'crypto';
import { pool } from '../config/db.js';

export interface NotificationEntry {
  recipientId?: string | null;
  recipientRole?: 'SUPER_ADMIN' | 'CUSTOMER_ADMIN' | string | null;
  businessId?: string | null;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export async function createNotification(entry: NotificationEntry): Promise<void> {
  try {
    const id = `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    await pool.query(
      `INSERT INTO notifications (
        id, recipient_id, recipient_role, business_id, title, message, type, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
      [
        id,
        entry.recipientId || null,
        entry.recipientRole || null,
        entry.businessId || null,
        entry.title,
        entry.message,
        entry.type || 'info',
      ]
    );
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err);
  }
}
