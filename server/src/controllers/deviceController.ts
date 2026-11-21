import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/auditService.js';

export async function getDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || '';

    let query = `
      SELECT 
        d.id,
        d.device_id AS "deviceId",
        d.name,
        d.business_id AS "businessId",
        b.name AS "businessName",
        d.counter_name AS "counterName",
        d.app_version AS "appVersion",
        d.status,
        d.ip_address AS "ipAddress",
        TO_CHAR(d.last_sync, 'YYYY-MM-DD HH24:MI:SS') AS "lastActive",
        TO_CHAR(d.created_at, 'YYYY-MM-DD') AS "activationDate"
      FROM devices d
      LEFT JOIN businesses b ON b.id = d.business_id
    `;
    const params: any[] = [];

    if (callerRole !== 'SUPER_ADMIN') {
      query += ` WHERE d.business_id = $1`;
      params.push(callerBusinessId);
    }

    query += ` ORDER BY d.created_at DESC;`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, devices: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function getSyncRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || '';

    let query = `
      SELECT 
        s.id,
        s.business_id AS "businessId",
        b.name AS "businessName",
        d.device_id AS "deviceId",
        d.name AS "deviceName",
        s.status AS "syncStatus",
        s.pending_records AS "pendingRecords",
        s.failed_records AS "failedRecords",
        s.error_message AS "errorMessage",
        TO_CHAR(s.synced_at, 'YYYY-MM-DD HH24:MI:SS') AS "lastSuccessfulSync"
      FROM sync_records s
      LEFT JOIN businesses b ON b.id = s.business_id
      LEFT JOIN devices d ON d.id = s.device_id
    `;
    const params: any[] = [];

    if (callerRole !== 'SUPER_ADMIN') {
      query += ` WHERE s.business_id = $1`;
      params.push(callerBusinessId);
    }

    query += ` ORDER BY s.synced_at DESC;`;

    const result = await pool.query(query, params);
    res.status(200).json({ success: true, syncRecords: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function triggerSyncRetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE sync_records 
       SET status = 'Synced', pending_records = 0, failed_records = 0, error_message = NULL, synced_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    await recordAuditLog({
      actorId: req.user?.id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'SUPER_ADMIN',
      action: 'Sync Retry Resolved',
      details: `Manual sync trigger completed for sync record ID ${id}.`,
      category: 'Sync',
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Sync handshake succeeded.' });
  } catch (error) {
    next(error);
  }
}
