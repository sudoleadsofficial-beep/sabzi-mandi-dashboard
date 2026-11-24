import { pool } from '../config/db.js';
import { SyncDeviceRecord } from '../middleware/syncAuthMiddleware.js';
import { replicateSyncBatch } from './syncReplicationService.js';

export interface IngestEventItem {
  event_uuid: string;
  device_id?: string;
  entity_type: string;
  entity_uuid: string;
  operation: string;
  payload: Record<string, any>;
  timestamp?: string;
}

export interface IngestResult {
  received_count: number;
  duplicate_count: number;
  accepted_event_uuids: string[];
  duplicate_event_uuids: string[];
  acknowledged_event_uuids: string[];
  processed_count: number;
  processing_errors: Array<{ event_uuid: string; error: string }>;
  server_timestamp: string;
}

export interface PulledEventItem {
  cursor: number;
  event_uuid: string;
  device_id: string;
  entity_type: string;
  entity_uuid: string;
  operation: string;
  payload: Record<string, any>;
  status: string;
  event_timestamp: string | null;
  received_at: string;
}

export interface PullResult {
  events: PulledEventItem[];
  next_cursor: number;
  has_more: boolean;
  server_timestamp: string;
}

export interface DeviceSyncStatusResult {
  device_id: string;
  device_uuid: string;
  status: string;
  last_seen_at: string | null;
  last_synced_at: string | null;
  latest_cursor: number;
  events: {
    total: number;
    received: number;
    processed: number;
    failed: number;
    rejected: number;
  };
  server_timestamp: string;
}

const ALLOWED_OPERATIONS = new Set(['create', 'update', 'delete']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string conforms to standard UUID format
 */
function isValidUuid(uuid: string): boolean {
  if (typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid.trim());
}

/**
 * Ingests a batch of pending events from a verified POS device into central PostgreSQL storage.
 * Enforces:
 *  - Strict business tenancy (assigned server-side from authenticated token)
 *  - Device ownership
 *  - Idempotent ingestion per event_uuid
 *  - Partial success resilience (malformed events do not abort valid events in batch)
 *  - Synchronization monitoring telemetry update
 */
export async function ingestEvents(
  device: SyncDeviceRecord,
  businessId: string,
  events: IngestEventItem[]
): Promise<IngestResult> {
  const acceptedUuids: string[] = [];
  const duplicateUuids: string[] = [];
  const processingErrors: Array<{ event_uuid: string; error: string }> = [];
  const seenInBatch = new Set<string>();
  const now = new Date();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const event of events) {
      const rawEventUuid = event.event_uuid;
      const rawEntityUuid = event.entity_uuid;
      const rawEntityType = event.entity_type;
      const rawOperation = event.operation;
      const payload = event.payload;

      // Validation 1: Event UUID
      if (!rawEventUuid || !isValidUuid(rawEventUuid)) {
        processingErrors.push({
          event_uuid: String(rawEventUuid || 'unknown'),
          error: 'Invalid or missing event_uuid. Must be a valid RFC4122 UUID.',
        });
        continue;
      }

      const eventUuid = rawEventUuid.trim().toLowerCase();

      // Validation 2: In-batch duplicate
      if (seenInBatch.has(eventUuid)) {
        duplicateUuids.push(eventUuid);
        continue;
      }
      seenInBatch.add(eventUuid);

      // Validation 3: Entity UUID
      if (!rawEntityUuid || !isValidUuid(rawEntityUuid)) {
        processingErrors.push({
          event_uuid: eventUuid,
          error: 'Invalid or missing entity_uuid. Must be a valid RFC4122 UUID.',
        });
        continue;
      }

      // Validation 4: Entity type
      if (!rawEntityType || typeof rawEntityType !== 'string' || rawEntityType.trim().length === 0) {
        processingErrors.push({
          event_uuid: eventUuid,
          error: 'Missing entity_type identifier.',
        });
        continue;
      }

      // Validation 5: Operation
      const operation = (rawOperation || '').trim().toLowerCase();
      if (!ALLOWED_OPERATIONS.has(operation)) {
        processingErrors.push({
          event_uuid: eventUuid,
          error: `Invalid operation "${rawOperation}". Allowed operations: create, update, delete.`,
        });
        continue;
      }

      // Validation 6: Payload
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        processingErrors.push({
          event_uuid: eventUuid,
          error: 'Invalid payload. Must be a JSON object dictionary.',
        });
        continue;
      }

      // Parse event timestamp safely
      let eventTimestamp: Date = now;
      if (event.timestamp) {
        const parsed = new Date(event.timestamp);
        if (!isNaN(parsed.getTime())) {
          eventTimestamp = parsed;
        }
      }

      // Idempotent insertion using ON CONFLICT (event_uuid) DO NOTHING
      const insertRes = await client.query(
        `
        INSERT INTO sync_events (
          event_uuid,
          business_id,
          device_id,
          entity_type,
          entity_uuid,
          operation,
          payload,
          status,
          event_timestamp,
          received_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'received', $8, NOW())
        ON CONFLICT (event_uuid) DO NOTHING
        RETURNING id;
        `,
        [
          eventUuid,
          businessId,
          device.device_id,
          rawEntityType.trim(),
          rawEntityUuid.trim().toLowerCase(),
          operation,
          JSON.stringify(payload),
          eventTimestamp,
        ]
      );

      if (insertRes.rows.length > 0) {
        acceptedUuids.push(eventUuid);
      } else {
        duplicateUuids.push(eventUuid);
      }
    }

    // Phase 8: Replicate business events into central PostgreSQL domain tables
    const eventsToReplicate = events.filter((e) =>
      e.event_uuid && acceptedUuids.includes(e.event_uuid.trim().toLowerCase())
    );
    let replicationProcessedCount = 0;

    if (eventsToReplicate.length > 0) {
      const repSummary = await replicateSyncBatch(client, businessId, eventsToReplicate);
      replicationProcessedCount = repSummary.processed;
      if (repSummary.errors.length > 0) {
        processingErrors.push(...repSummary.errors);
      }
    }

    // Update device last_sync
    await client.query(
      `UPDATE devices SET last_sync = NOW(), updated_at = NOW() WHERE id = $1;`,
      [device.id]
    );

    // Update telemetry in sync_records
    const telemetryId = `sync-${device.id}`;
    const telemetryStatus = processingErrors.length > 0 ? 'Warning' : 'Synced';
    const errorMessage = processingErrors.length > 0
      ? processingErrors.map((e) => `${e.event_uuid}: ${e.error}`).join(' | ')
      : null;

    await client.query(
      `
      INSERT INTO sync_records (
        id,
        device_id,
        business_id,
        status,
        pending_records,
        failed_records,
        error_message,
        synced_at
      )
      VALUES ($1, $2, $3, $4, 0, $5, $6, NOW())
      ON CONFLICT (device_id, business_id) DO UPDATE SET
        status = EXCLUDED.status,
        pending_records = 0,
        failed_records = EXCLUDED.failed_records,
        error_message = EXCLUDED.error_message,
        synced_at = NOW();
      `,
      [
        telemetryId,
        device.id,
        businessId,
        telemetryStatus,
        processingErrors.length,
        errorMessage,
      ]
    );

    await client.query('COMMIT');

    return {
      received_count: acceptedUuids.length,
      duplicate_count: duplicateUuids.length,
      accepted_event_uuids: acceptedUuids,
      duplicate_event_uuids: duplicateUuids,
      acknowledged_event_uuids: [...acceptedUuids, ...duplicateUuids],
      processed_count: replicationProcessedCount,
      processing_errors: processingErrors,
      server_timestamp: now.toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves cursor-paginated events strictly scoped to the tenant business.
 * Supports:
 *  - Incremental pagination via monotonic BIGSERIAL cursor
 *  - Excluding self-originating events
 *  - Filter by optional since_timestamp
 */
export async function pullEvents(
  device: SyncDeviceRecord,
  businessId: string,
  sinceCursor: number = 0,
  sinceTimestamp: string | null = null,
  limit: number = 100,
  includeSelf: boolean = false
): Promise<PullResult> {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const safeCursor = Math.max(0, sinceCursor);

  let parsedTimestamp: Date | null = null;
  if (sinceTimestamp) {
    const t = new Date(sinceTimestamp);
    if (!isNaN(t.getTime())) {
      parsedTimestamp = t;
    }
  }

  // Fetch limit + 1 to detect has_more without an extra count query
  const query = `
    SELECT 
      id,
      event_uuid,
      device_id,
      entity_type,
      entity_uuid,
      operation,
      payload,
      status,
      event_timestamp,
      received_at
    FROM sync_events
    WHERE business_id = $1
      AND id > $2
      AND ($3::boolean = true OR device_id != $4)
      AND ($5::timestamptz IS NULL OR received_at >= $5::timestamptz)
    ORDER BY id ASC
    LIMIT $6;
  `;

  const result = await pool.query(query, [
    businessId,
    safeCursor,
    includeSelf,
    device.device_id,
    parsedTimestamp,
    safeLimit + 1,
  ]);

  const rows = result.rows;
  const hasMore = rows.length > safeLimit;
  const items = hasMore ? rows.slice(0, safeLimit) : rows;

  const nextCursor = items.length > 0 ? Number(items[items.length - 1].id) : safeCursor;

  const events: PulledEventItem[] = items.map((row) => ({
    cursor: Number(row.id),
    event_uuid: row.event_uuid,
    device_id: row.device_id,
    entity_type: row.entity_type,
    entity_uuid: row.entity_uuid,
    operation: row.operation,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    status: row.status,
    event_timestamp: row.event_timestamp ? new Date(row.event_timestamp).toISOString() : null,
    received_at: new Date(row.received_at).toISOString(),
  }));

  return {
    events,
    next_cursor: nextCursor,
    has_more: hasMore,
    server_timestamp: new Date().toISOString(),
  };
}

/**
 * Returns server-side sync event metrics and cursor status for a verified POS device.
 */
export async function getDeviceSyncStatus(
  device: SyncDeviceRecord,
  businessId: string
): Promise<DeviceSyncStatusResult> {
  // Aggregate event counts by status for this specific device in this business
  const countQuery = `
    SELECT status, COUNT(*)::int AS count
    FROM sync_events
    WHERE business_id = $1 AND device_id = $2
    GROUP BY status;
  `;
  const countRes = await pool.query(countQuery, [businessId, device.device_id]);

  const counts: Record<string, number> = {
    received: 0,
    processed: 0,
    failed: 0,
    rejected: 0,
  };

  for (const row of countRes.rows) {
    const s = (row.status || '').toLowerCase();
    if (counts[s] !== undefined) {
      counts[s] = Number(row.count);
    } else {
      counts[s] = Number(row.count);
    }
  }

  // Get highest cursor within business
  const cursorRes = await pool.query(
    `SELECT COALESCE(MAX(id), 0)::bigint AS max_cursor FROM sync_events WHERE business_id = $1;`,
    [businessId]
  );
  const latestCursor = Number(cursorRes.rows[0]?.max_cursor || 0);

  const total = counts.received + counts.processed + counts.failed + counts.rejected;

  return {
    device_id: device.device_id,
    device_uuid: device.id,
    status: device.status,
    last_seen_at: device.last_sync ? new Date(device.last_sync).toISOString() : null,
    last_synced_at: device.last_sync ? new Date(device.last_sync).toISOString() : null,
    latest_cursor: latestCursor,
    events: {
      total,
      received: counts.received,
      processed: counts.processed,
      failed: counts.failed,
      rejected: counts.rejected,
    },
    server_timestamp: new Date().toISOString(),
  };
}

/**
 * Registers a new POS desktop device or updates device metadata for an authenticated business.
 */
export async function registerDevice(
  businessId: string,
  deviceData: {
    device_id: string;
    device_name?: string;
    hostname?: string;
    os?: string;
    app_version?: string;
    metadata?: Record<string, any>;
  },
  apiToken: string
): Promise<{
  device_uuid: string;
  device_id: string;
  device_name: string;
  status: string;
  api_token: string;
  created: boolean;
}> {
  const deviceId = deviceData.device_id.trim();
  const deviceName = deviceData.device_name || `Terminal ${deviceId.slice(-6)}`;

  const query = `
    INSERT INTO devices (
      id,
      device_id,
      business_id,
      name,
      counter_name,
      hostname,
      os,
      app_version,
      metadata,
      status,
      last_sync,
      created_at,
      updated_at
    )
    VALUES ($1, $1, $2, $3, 'Counter 1', $4, $5, COALESCE($6, 'v2.4.1'), $7, 'Active', NOW(), NOW(), NOW())
    ON CONFLICT (device_id) DO UPDATE SET
      business_id = EXCLUDED.business_id,
      name = COALESCE(EXCLUDED.name, devices.name),
      hostname = COALESCE(EXCLUDED.hostname, devices.hostname),
      os = COALESCE(EXCLUDED.os, devices.os),
      app_version = COALESCE(EXCLUDED.app_version, devices.app_version),
      metadata = COALESCE(EXCLUDED.metadata, devices.metadata),
      status = 'Active',
      last_sync = NOW(),
      updated_at = NOW()
    RETURNING id, device_id, name, status, (xmax = 0) AS created;
  `;

  const result = await pool.query(query, [
    deviceId,
    businessId,
    deviceName,
    deviceData.hostname || null,
    deviceData.os || null,
    deviceData.app_version || null,
    deviceData.metadata ? JSON.stringify(deviceData.metadata) : null,
  ]);

  const row = result.rows[0];

  return {
    device_uuid: row.id,
    device_id: row.device_id,
    device_name: row.name,
    status: row.status,
    api_token: apiToken,
    created: Boolean(row.created),
  };
}
