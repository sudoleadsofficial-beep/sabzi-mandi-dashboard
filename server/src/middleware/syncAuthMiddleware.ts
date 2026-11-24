import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export interface SyncDeviceRecord {
  id: string;
  device_id: string;
  name: string;
  business_id: string;
  counter_name?: string;
  app_version?: string;
  status: string;
  last_sync?: Date | string;
}

// Extend Express Request to include syncDevice
declare global {
  namespace Express {
    interface Request {
      syncDevice?: SyncDeviceRecord;
    }
  }
}

/**
 * Middleware to authenticate and verify originating POS device for sync operations.
 * Enforces:
 *  1. JWT authentication is valid and contains businessId.
 *  2. Header X-Device-Id matches body/query device_id if both provided.
 *  3. Device exists in database, belongs to the authenticated business, and is Active.
 */
export async function verifySyncDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    const businessId = user?.businessId;

    if (!user || !businessId) {
      res.status(401).json({
        success: false,
        error: 'unauthenticated_business',
        message: 'Valid business context is required in the authentication token.',
      });
      return;
    }

    const headerDeviceId = (req.headers['x-device-id'] as string || '').trim();
    const payloadDeviceId = (req.body?.device_id || req.query?.device_id || '') as string;
    const cleanPayloadDeviceId = typeof payloadDeviceId === 'string' ? payloadDeviceId.trim() : '';

    const deviceId = headerDeviceId || cleanPayloadDeviceId;

    if (!deviceId) {
      res.status(401).json({
        success: false,
        error: 'unauthenticated_device',
        message: 'Missing device credentials. X-Device-Id header or device_id parameter is required.',
      });
      return;
    }

    // Verify consistency if both header and payload specify device_id
    if (headerDeviceId && cleanPayloadDeviceId && headerDeviceId !== cleanPayloadDeviceId) {
      res.status(403).json({
        success: false,
        error: 'device_id_mismatch',
        message: 'Header device ID does not match payload device ID.',
      });
      return;
    }

    // Look up device scoped strictly to the authenticated tenant
    const result = await pool.query(
      `
      SELECT id, device_id, name, business_id, counter_name, app_version, status, last_sync
      FROM devices
      WHERE (device_id = $1 OR id = $1) AND business_id = $2
      LIMIT 1;
      `,
      [deviceId, businessId]
    );

    if (result.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: 'unregistered_device',
        message: 'Device is not registered or does not belong to the authenticated business.',
      });
      return;
    }

    const device = result.rows[0] as SyncDeviceRecord;

    if (device.status !== 'Active') {
      res.status(403).json({
        success: false,
        error: 'device_inactive',
        message: 'This POS terminal device has been deactivated. Please contact your administrator.',
      });
      return;
    }

    req.syncDevice = device;
    req.businessId = device.business_id;

    next();
  } catch (error) {
    next(error);
  }
}
