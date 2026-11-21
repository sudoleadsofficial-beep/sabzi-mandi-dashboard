import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const callerRole = (req.user?.role || '').trim().toUpperCase();
    const callerBusinessId = req.user?.businessId || '';

    let query = `
      SELECT 
        id,
        actor_name AS "userName",
        actor_role AS "userRole",
        action,
        target_entity AS "targetEntity",
        target_id AS "targetId",
        business_id AS "businessId",
        business_name AS "businessName",
        details AS "activityDescription",
        category,
        ip_address AS "ipAddress",
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "timestamp"
      FROM audit_logs
    `;
    const params: any[] = [];

    if (callerRole !== 'SUPER_ADMIN') {
      query += ` WHERE business_id = $1`;
      params.push(callerBusinessId);
    }

    query += ` ORDER BY created_at DESC LIMIT 100;`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      auditLogs: result.rows,
    });
  } catch (error) {
    next(error);
  }
}
