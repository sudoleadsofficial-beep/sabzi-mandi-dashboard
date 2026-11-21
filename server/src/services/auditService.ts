import crypto from 'crypto';
import { pool } from '../config/db.js';

export interface AuditLogEntry {
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity?: string;
  targetId?: string;
  businessId?: string | null;
  businessName?: string;
  details?: string;
  category: 'Business' | 'User' | 'Invitation' | 'Settings' | 'Sync' | 'Security' | 'Device';
  ipAddress?: string;
}

export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    await pool.query(
      `INSERT INTO audit_logs (
        id, actor_id, actor_name, actor_role, action, target_entity, 
        target_id, business_id, business_name, details, category, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        id,
        entry.actorId || null,
        entry.actorName,
        entry.actorRole,
        entry.action,
        entry.targetEntity || null,
        entry.targetId || null,
        entry.businessId || null,
        entry.businessName || null,
        entry.details || null,
        entry.category,
        entry.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err);
  }
}
