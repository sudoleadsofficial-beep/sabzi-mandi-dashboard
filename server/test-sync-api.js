import http from 'http';
import { app } from './dist/index.js';
import { pool } from './dist/config/db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'pos-mandi-super-secret-jwt-key-2026-production';

function generateUuid() {
  return crypto.randomUUID();
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

let server;
let baseUrl = '';

async function startTestServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve(port);
    });
  });
}

async function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Test Server] Stopped.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, body: json };
}

async function runAllTests() {
  console.log('================================================================');
  console.log(' SABZI MANDI POS — PHASE 7 CENTRAL SYNC INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await startTestServer();

  const results = [];
  function assert(id, description, condition, detail = '') {
    results.push({ id, description, passed: Boolean(condition), detail });
    const mark = condition ? '✅ PASS' : '❌ FAIL';
    console.log(`[Test ${String(id).padStart(2, '0')}] ${mark}: ${description}`);
    if (detail && !condition) {
      console.log(`       Error: ${detail}`);
    } else if (detail) {
      console.log(`       Info: ${detail}`);
    }
  }

  const timestamp = Date.now();
  const bizA_id = `biz-sync-a-${timestamp}`;
  const bizB_id = `biz-sync-b-${timestamp}`;
  const devA1_id = `pos-dev-a1-${timestamp.toString().slice(-6)}`;
  const devA2_id = `pos-dev-a2-${timestamp.toString().slice(-6)}`;
  const devB1_id = `pos-dev-b1-${timestamp.toString().slice(-6)}`;

  try {
    // -------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------
    console.log('\n--- 1. Setting up Isolated Test Tenants & Devices ---');

    await pool.query(
      `INSERT INTO businesses (id, name, owner_name, email, city, mandi_location, status)
       VALUES ($1, 'Sabzi Mandi Test Tenant A', 'Malik Asif', $2, 'Lahore', 'Badami Bagh', 'Active'),
              ($3, 'Sabzi Mandi Test Tenant B', 'Chaudhry Riaz', $4, 'Rawalpindi', 'I-11 Mandi', 'Active')
       ON CONFLICT (id) DO NOTHING;`,
      [bizA_id, `test_a_${timestamp}@manditest.pk`, bizB_id, `test_b_${timestamp}@manditest.pk`]
    );

    await pool.query(
      `INSERT INTO devices (id, device_id, business_id, name, counter_name, status, last_sync)
       VALUES ($1, $1, $2, 'Terminal A1', 'Counter 1', 'Active', NOW()),
              ($3, $3, $2, 'Terminal A2', 'Counter 2', 'Active', NOW()),
              ($4, $4, $5, 'Terminal B1', 'Counter 1', 'Active', NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [devA1_id, bizA_id, devA2_id, devB1_id, bizB_id]
    );

    const tokenBizA = createToken({
      id: `usr-a-${timestamp}`,
      name: 'Cashier A',
      email: `cashier_a_${timestamp}@mandi.pk`,
      role: 'CASHIER',
      businessId: bizA_id,
      businessName: 'Sabzi Mandi Test Tenant A',
    });

    const tokenBizB = createToken({
      id: `usr-b-${timestamp}`,
      name: 'Cashier B',
      email: `cashier_b_${timestamp}@mandi.pk`,
      role: 'CASHIER',
      businessId: bizB_id,
      businessName: 'Sabzi Mandi Test Tenant B',
    });

    console.log(`Created Business A (${bizA_id}) with devices [${devA1_id}, ${devA2_id}]`);
    console.log(`Created Business B (${bizB_id}) with device [${devB1_id}]`);

    // -------------------------------------------------------------
    // Group 1: Authentication & Device Verification
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Authentication & Device Verification ---');

    // Test 1: Unauthenticated request rejected
    const unauthRes = await apiRequest('/api/v1/sync/pull');
    assert(1, 'Unauthenticated sync pull is rejected with 401', unauthRes.status === 401);

    // Test 2: Invalid JWT rejected
    const invalidJwtRes = await apiRequest('/api/v1/sync/pull', {
      headers: { Authorization: 'Bearer invalid.token.signature' },
    });
    assert(2, 'Invalid JWT token is rejected with 401', invalidJwtRes.status === 401);

    // Test 3: Missing device ID rejected
    const noDeviceRes = await apiRequest('/api/v1/sync/pull', {
      headers: { Authorization: `Bearer ${tokenBizA}` },
    });
    assert(3, 'Request without X-Device-Id or device_id is rejected with 401', noDeviceRes.status === 401);

    // Test 4: Device-business mismatch rejected (Device B1 attempting to sync with Business A's token)
    const mismatchRes = await apiRequest('/api/v1/sync/pull', {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devB1_id,
      },
    });
    assert(
      4,
      'Device belonging to Business B is rejected when using Business A token (403)',
      mismatchRes.status === 403,
      `Received status: ${mismatchRes.status}, error: ${mismatchRes.body?.error}`
    );

    // Test 5: Device ID mismatch between header and body rejected
    const headerBodyMismatch = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA2_id, // mismatch!
        events: [],
      },
    });
    assert(5, 'Header device_id and body device_id mismatch is rejected with 403', headerBodyMismatch.status === 403);

    // Test 6: Deactivated device rejected
    await pool.query(`UPDATE devices SET status = 'Inactive' WHERE id = $1;`, [devA2_id]);
    const inactiveDevRes = await apiRequest('/api/v1/sync/pull', {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA2_id,
      },
    });
    assert(6, 'Deactivated (Inactive) device is rejected with 403', inactiveDevRes.status === 403);
    await pool.query(`UPDATE devices SET status = 'Active' WHERE id = $1;`, [devA2_id]); // restore

    // -------------------------------------------------------------
    // Group 2: Upload API & Idempotency
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Event Upload & Ingestion ---');

    const eventUuid1 = generateUuid();
    const eventUuid2 = generateUuid();
    const entityUuid1 = generateUuid();
    const entityUuid2 = generateUuid();

    // Test 7: Valid batch upload succeeds
    const uploadRes1 = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          {
            event_uuid: eventUuid1,
            device_id: devA1_id,
            entity_type: 'Merchant',
            entity_uuid: entityUuid1,
            operation: 'create',
            payload: { name: 'Al-Madina Fruit Traders', phone: '03001234567', commission_rate: 6.0 },
            timestamp: new Date().toISOString(),
          },
          {
            event_uuid: eventUuid2,
            device_id: devA1_id,
            entity_type: 'Item',
            entity_uuid: entityUuid2,
            operation: 'create',
            payload: { name: 'Tomato (Tamatar)', category: 'Vegetables', unit: 'kg' },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });

    assert(
      7,
      'Batch upload of 2 events succeeds with HTTP 200',
      uploadRes1.status === 200 && uploadRes1.body?.success === true
    );
    assert(
      8,
      'Upload response contains acknowledged_event_uuids matching both events',
      uploadRes1.body?.data?.received_count === 2 &&
        uploadRes1.body?.data?.acknowledged_event_uuids?.includes(eventUuid1) &&
        uploadRes1.body?.data?.acknowledged_event_uuids?.includes(eventUuid2)
    );

    // Test 9: Duplicate event upload handled idempotently (retry safety)
    const uploadResRetry = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          {
            event_uuid: eventUuid1, // DUPLICATE
            device_id: devA1_id,
            entity_type: 'Merchant',
            entity_uuid: entityUuid1,
            operation: 'create',
            payload: { name: 'Al-Madina Fruit Traders' },
          },
        ],
      },
    });

    assert(
      9,
      'Duplicate event is acknowledged without creating a new record (Idempotent)',
      uploadResRetry.status === 200 &&
        uploadResRetry.body?.data?.duplicate_count === 1 &&
        uploadResRetry.body?.data?.acknowledged_event_uuids?.includes(eventUuid1),
      `Duplicate count: ${uploadResRetry.body?.data?.duplicate_count}`
    );

    // Verify database row count for eventUuid1
    const countCheck = await pool.query(`SELECT COUNT(*)::int as count FROM sync_events WHERE event_uuid = $1;`, [eventUuid1]);
    assert(10, 'Database contains exactly 1 persistent record for eventUuid1', countCheck.rows[0].count === 1);

    // Test 11: Malformed individual event handled safely (partial batch resilience)
    const malformedUuid = 'not-a-valid-uuid';
    const validUuid3 = generateUuid();
    const partialRes = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          {
            event_uuid: malformedUuid, // MALFORMED UUID
            entity_type: 'Customer',
            entity_uuid: generateUuid(),
            operation: 'create',
            payload: { name: 'Broken Event' },
          },
          {
            event_uuid: validUuid3, // VALID
            entity_type: 'Customer',
            entity_uuid: generateUuid(),
            operation: 'create',
            payload: { name: 'Haji Kareem', phone: '03217654321' },
          },
        ],
      },
    });

    assert(
      11,
      'Batch with 1 malformed and 1 valid event accepts valid event and records error',
      partialRes.status === 200 &&
        partialRes.body?.data?.received_count === 1 &&
        partialRes.body?.data?.processing_errors?.length === 1 &&
        partialRes.body?.data?.acknowledged_event_uuids?.includes(validUuid3)
    );

    // -------------------------------------------------------------
    // Group 3: Download (Pull) API & Cursor Pagination
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Event Download (Pull) & Cursor Pagination ---');

    // Terminal A2 pulls changes created by Terminal A1
    const pullA2Res = await apiRequest(`/api/v1/sync/pull?since_cursor=0&limit=10&include_self=false`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA2_id,
      },
    });

    assert(
      12,
      'Terminal A2 successfully retrieves events created by Terminal A1',
      pullA2Res.status === 200 && pullA2Res.body?.data?.events?.length >= 3
    );

    const pulledUuids = (pullA2Res.body?.data?.events || []).map((e) => e.event_uuid);
    assert(
      13,
      'Pulled events contain eventUuid1, eventUuid2, and validUuid3',
      pulledUuids.includes(eventUuid1) && pulledUuids.includes(eventUuid2) && pulledUuids.includes(validUuid3)
    );

    // Test 14: Self-origin exclusion (Terminal A1 pulls with include_self=false)
    const pullA1Res = await apiRequest(`/api/v1/sync/pull?since_cursor=0&limit=10&include_self=false`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
    });
    assert(
      14,
      'Terminal A1 excludes its own events when include_self=false',
      pullA1Res.status === 200 && pullA1Res.body?.data?.events?.length === 0,
      `Events count returned to originator: ${pullA1Res.body?.data?.events?.length}`
    );

    // Test 15: include_self=true returns Terminal A1 events
    const pullA1SelfRes = await apiRequest(`/api/v1/sync/pull?since_cursor=0&limit=10&include_self=true`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
    });
    assert(
      15,
      'Terminal A1 includes its own events when include_self=true',
      pullA1SelfRes.status === 200 && pullA1SelfRes.body?.data?.events?.length >= 3
    );

    // Test 16: Cursor pagination (page size = 1)
    const page1 = await apiRequest(`/api/v1/sync/pull?since_cursor=0&limit=1&include_self=true`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA2_id,
      },
    });
    const cursor1 = page1.body?.data?.next_cursor;
    assert(16, 'Page 1 pagination returns 1 event and has_more=true', page1.body?.data?.events?.length === 1 && page1.body?.data?.has_more === true);

    const page2 = await apiRequest(`/api/v1/sync/pull?since_cursor=${cursor1}&limit=1&include_self=true`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA2_id,
      },
    });
    const event1Uuid = page1.body?.data?.events[0]?.event_uuid;
    const event2Uuid = page2.body?.data?.events[0]?.event_uuid;
    assert(
      17,
      'Page 2 pagination advances cursor without repeating Page 1 event',
      page2.body?.data?.events?.length === 1 && event1Uuid !== event2Uuid
    );

    // Test 18: Invalid cursor parameter rejected
    const invalidCursorRes = await apiRequest(`/api/v1/sync/pull?since_cursor=-5`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
    });
    assert(18, 'Invalid cursor (negative number) is rejected with 400', invalidCursorRes.status === 400);

    // -------------------------------------------------------------
    // Group 4: Multi-Tenant Data Isolation
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Tenant Strict Isolation ---');

    // Test 19: Business B device pulls events — MUST NOT see any of Business A's events
    const pullBizBRes = await apiRequest(`/api/v1/sync/pull?since_cursor=0&limit=50&include_self=true`, {
      headers: {
        Authorization: `Bearer ${tokenBizB}`,
        'X-Device-Id': devB1_id,
      },
    });
    assert(
      19,
      'Business B receives ZERO events from Business A (Complete Tenant Isolation)',
      pullBizBRes.status === 200 && pullBizBRes.body?.data?.events?.length === 0,
      `Events returned for Business B: ${pullBizBRes.body?.data?.events?.length}`
    );

    // Business B uploads its own event
    const eventUuidB1 = generateUuid();
    await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBizB}`,
        'X-Device-Id': devB1_id,
      },
      body: {
        device_id: devB1_id,
        events: [
          {
            event_uuid: eventUuidB1,
            entity_type: 'Merchant',
            entity_uuid: generateUuid(),
            operation: 'create',
            payload: { name: 'Pindi Merchant Store' },
          },
        ],
      },
    });

    // Test 20: Business A pulls — MUST NOT see Business B's event
    const pullBizA_Again = await apiRequest(`/api/v1/sync/pull?since_cursor=0&limit=50&include_self=true`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
    });
    const bizA_all_uuids = (pullBizA_Again.body?.data?.events || []).map((e) => e.event_uuid);
    assert(
      20,
      "Business A cannot see Business B's eventUuidB1 (Strict Isolation)",
      !bizA_all_uuids.includes(eventUuidB1)
    );

    // -------------------------------------------------------------
    // Group 5: Sync Status & Telemetry Integration
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Telemetry & Status API ---');

    // Test 21: Device sync status endpoint
    const statusRes = await apiRequest('/api/v1/sync/status', {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
    });
    assert(
      21,
      'GET /api/v1/sync/status returns correct device metrics and event counts',
      statusRes.status === 200 &&
        statusRes.body?.data?.device_id === devA1_id &&
        statusRes.body?.data?.events?.total >= 3 &&
        statusRes.body?.data?.latest_cursor > 0,
      `Latest cursor: ${statusRes.body?.data?.latest_cursor}, Total events: ${statusRes.body?.data?.events?.total}`
    );

    // Test 22: Dashboard sync_records table contains telemetry record
    const telemetryRes = await pool.query(
      `SELECT status, pending_records, failed_records, synced_at 
       FROM sync_records 
       WHERE device_id = $1 AND business_id = $2;`,
      [devA1_id, bizA_id]
    );
    assert(
      22,
      'Dashboard telemetry table sync_records has an up-to-date row for Terminal A1',
      telemetryRes.rows.length === 1 && telemetryRes.rows[0].status !== null,
      `Status in sync_records: ${telemetryRes.rows[0]?.status}`
    );

    // Test 23: Backward-compatible /api/sync/pull (without /v1)
    const compatPullRes = await apiRequest(`/api/sync/pull?since_cursor=0&limit=5&include_self=true`, {
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
        'X-Device-Id': devA1_id,
      },
    });
    assert(
      23,
      'Backward-compatible route /api/sync/pull works identically to /api/v1/sync/pull',
      compatPullRes.status === 200 && compatPullRes.body?.data?.events?.length >= 3
    );

    // Test 24: Device Registration / Credential Rotation
    const newDeviceId = `pos-dev-new-${timestamp.toString().slice(-6)}`;
    const regRes = await apiRequest('/api/v1/sync/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenBizA}`,
      },
      body: {
        device_id: newDeviceId,
        device_name: 'Counter 3 Desktop Terminal',
        hostname: 'JKC-POS-03',
        os: 'Windows',
        app_version: 'v2.4.1',
      },
    });
    assert(
      24,
      'POST /api/v1/sync/register registers new desktop terminal and returns credentials',
      regRes.status === 201 &&
        regRes.body?.data?.device_id === newDeviceId &&
        regRes.body?.data?.created === true
    );
  } finally {
    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    console.log('\n--- 7. Cleaning up Isolated Test Data ---');
    try {
      await pool.query(`DELETE FROM sync_events WHERE business_id IN ($1, $2);`, [bizA_id, bizB_id]);
      await pool.query(`DELETE FROM sync_records WHERE business_id IN ($1, $2);`, [bizA_id, bizB_id]);
      await pool.query(`DELETE FROM devices WHERE business_id IN ($1, $2);`, [bizA_id, bizB_id]);
      await pool.query(`DELETE FROM businesses WHERE id IN ($1, $2);`, [bizA_id, bizB_id]);
      console.log('Test records safely removed from PostgreSQL.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    await stopTestServer();
  }

  console.log('\n================================================================');
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  console.log(` RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests()
  .then(() => {
    console.log('[Test Suite] Completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Test Suite Error]:', err);
    process.exit(1);
  });
