import { Request, Response, NextFunction } from 'express';
import { 
  ingestEvents, 
  pullEvents, 
  getDeviceSyncStatus, 
  registerDevice 
} from '../services/syncService.js';

const DEVICE_ID_REGEX = /^[A-Za-z0-9\-_]{8,64}$/;

/**
 * Ingest a batch of pending synchronization events from a verified POS desktop device.
 * Endpoint: POST /api/v1/sync/push
 */
export async function pushEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const device = req.syncDevice;
    const businessId = req.businessId || device?.business_id;

    if (!device || !businessId) {
      res.status(401).json({
        success: false,
        error: 'unauthenticated_device',
        message: 'Device verification failed.',
      });
      return;
    }

    // Verify device_id if provided in body matches verified device
    if (req.body?.device_id && req.body.device_id.trim() !== device.device_id) {
      res.status(403).json({
        success: false,
        error: 'device_id_mismatch',
        message: 'Authenticated device does not match payload device ID.',
      });
      return;
    }

    const events = req.body?.events;
    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        success: false,
        error: 'invalid_events_batch',
        message: 'The events field must be a non-empty array of sync events.',
      });
      return;
    }

    const maxBatchSize = parseInt(process.env.SYNC_MAX_BATCH_SIZE || '100', 10);
    if (events.length > maxBatchSize) {
      res.status(400).json({
        success: false,
        error: 'batch_size_exceeded',
        message: `Maximum batch size of ${maxBatchSize} exceeded. Received ${events.length} events.`,
      });
      return;
    }

    const result = await ingestEvents(device, businessId, events);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve cursor-paginated synchronization changes from the central event storage.
 * Endpoints: GET /api/v1/sync/pull, POST /api/v1/sync/pull
 */
export async function pullEventsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const device = req.syncDevice;
    const businessId = req.businessId || device?.business_id;

    if (!device || !businessId) {
      res.status(401).json({
        success: false,
        error: 'unauthenticated_device',
        message: 'Device verification failed.',
      });
      return;
    }

    // Read parameters from query for GET or body for POST
    const rawCursor = req.query.since_cursor ?? req.body?.since_cursor ?? '0';
    const rawLimit = req.query.limit ?? req.body?.limit ?? '100';
    const rawSinceTimestamp = req.query.since_timestamp ?? req.body?.since_timestamp ?? null;
    const rawIncludeSelf = req.query.include_self ?? req.body?.include_self ?? false;

    const sinceCursor = parseInt(String(rawCursor), 10);
    if (isNaN(sinceCursor) || sinceCursor < 0) {
      res.status(400).json({
        success: false,
        error: 'invalid_cursor',
        message: 'The since_cursor parameter must be a non-negative integer.',
      });
      return;
    }

    const limit = parseInt(String(rawLimit), 10);
    if (isNaN(limit) || limit < 1 || limit > 500) {
      res.status(400).json({
        success: false,
        error: 'invalid_limit',
        message: 'The limit parameter must be an integer between 1 and 500.',
      });
      return;
    }

    const includeSelf = rawIncludeSelf === true || rawIncludeSelf === 'true' || rawIncludeSelf === '1';
    const sinceTimestamp = rawSinceTimestamp ? String(rawSinceTimestamp) : null;

    const result = await pullEvents(device, businessId, sinceCursor, sinceTimestamp, limit, includeSelf);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Return server-side sync status for the authenticated POS device.
 * Endpoint: GET /api/v1/sync/status
 */
export async function getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const device = req.syncDevice;
    const businessId = req.businessId || device?.business_id;

    if (!device || !businessId) {
      res.status(401).json({
        success: false,
        error: 'unauthenticated_device',
        message: 'Device verification failed.',
      });
      return;
    }

    const result = await getDeviceSyncStatus(device, businessId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a POS desktop device or rotate its credentials for an authenticated business.
 * Endpoint: POST /api/v1/sync/register
 */
export async function registerDeviceController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    const businessId = user?.businessId;

    if (!user || !businessId) {
      res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: 'Valid employee authentication token is required to register a POS device.',
      });
      return;
    }

    const rawDeviceId = req.body?.device_id;
    if (!rawDeviceId || typeof rawDeviceId !== 'string' || !DEVICE_ID_REGEX.test(rawDeviceId.trim())) {
      res.status(400).json({
        success: false,
        error: 'invalid_device_id',
        message: 'device_id is required, must be 8-64 alphanumeric characters, and may include hyphens/underscores.',
      });
      return;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';

    const result = await registerDevice(
      businessId,
      {
        device_id: rawDeviceId.trim(),
        device_name: req.body?.device_name,
        hostname: req.body?.hostname,
        os: req.body?.os,
        app_version: req.body?.app_version,
        metadata: req.body?.metadata,
      },
      token
    );

    res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.created
        ? 'Device registered successfully.'
        : 'Device credentials rotated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns latest role permissions for the POS device's business
 * Endpoint: GET /api/v1/sync/permissions
 */
export async function getSyncPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pool } = await import('../config/db.js');
    let businessId = req.businessId || req.syncDevice?.business_id || (req.query.business_id as string) || (req.headers['x-business-id'] as string);

    // Check JWT token if provided
    if (!businessId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.decode(token) as any;
        if (decoded?.businessId) {
          businessId = decoded.businessId;
        }
      } catch {
        // Ignore token decode error
      }
    }

    // Check device ID header if provided
    if (!businessId && req.headers['x-device-id']) {
      const devRes = await pool.query('SELECT business_id FROM devices WHERE device_id = $1 LIMIT 1', [req.headers['x-device-id']]);
      if (devRes.rows.length > 0) {
        businessId = devRes.rows[0].business_id;
      }
    }

    if (!businessId) {
      // Safe fallback to active business if running single-shop terminal
      const defaultBiz = await pool.query("SELECT id FROM businesses WHERE status = 'Active' ORDER BY created_at ASC LIMIT 1");
      if (defaultBiz.rows.length > 0) {
        businessId = defaultBiz.rows[0].id;
      } else {
        res.status(400).json({ success: false, message: 'Missing business identification context.' });
        return;
      }
    }

    const bizRes = await pool.query('SELECT id, name, settings FROM businesses WHERE id = $1', [businessId]);
    if (bizRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Business not found.' });
      return;
    }

    const settings = bizRes.rows[0].settings || {};
    let rolePermissions = settings.rolePermissions;

    const ALL_POS_FEATURE_KEYS = [
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

    if (!rolePermissions || !Array.isArray(rolePermissions)) {
      rolePermissions = [
        {
          id: 'role-admin',
          name: 'Admin',
          allowedFeatures: ALL_POS_FEATURE_KEYS,
        },
        {
          id: 'role-employee',
          name: 'Employee',
          allowedFeatures: DEFAULT_EMPLOYEE_FEATURES,
        },
      ];
    } else {
      rolePermissions = rolePermissions.map((r: any) => {
        if (r.id === 'role-admin' || (r.name && r.name.toLowerCase() === 'admin')) {
          return {
            id: 'role-admin',
            name: 'Admin',
            allowedFeatures: ALL_POS_FEATURE_KEYS,
          };
        }
        return {
          id: 'role-employee',
          name: 'Employee',
          allowedFeatures: Array.isArray(r.allowedFeatures)
            ? r.allowedFeatures.filter((f: string) => ALL_POS_FEATURE_KEYS.includes(f))
            : DEFAULT_EMPLOYEE_FEATURES,
        };
      });
    }

    res.status(200).json({
      success: true,
      businessId,
      businessName: bizRes.rows[0].name,
      rolePermissions,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
