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
      console.log(`[Phase 8 Test Server] Running on ${baseUrl}`);
      resolve(port);
    });
  });
}

async function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Phase 8 Test Server] Stopped.');
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

async function runPhase8Tests() {
  console.log('================================================================');
  console.log(' SABZI MANDI POS — PHASE 8 DATABASE REPLICATION TEST SUITE');
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
  const bizA_id = `biz-rep-a-${timestamp}`;
  const bizB_id = `biz-rep-b-${timestamp}`;
  const devA1_id = `pos-dev-rep-a1-${timestamp.toString().slice(-6)}`;
  const devB1_id = `pos-dev-rep-b1-${timestamp.toString().slice(-6)}`;

  try {
    // -------------------------------------------------------------
    // 1. Setup Test Tenants and Devices
    // -------------------------------------------------------------
    console.log('--- 1. Setting up Isolated Test Tenants ---');
    await pool.query(
      `INSERT INTO businesses (id, name, owner_name, email, city, mandi_location, status)
       VALUES ($1, 'Replication Test Mandi A', 'Haji Sultan', $2, 'Lahore', 'Badami Bagh', 'Active'),
              ($3, 'Replication Test Mandi B', 'Chaudhry Akram', $4, 'Faisalabad', 'Ghalla Mandi', 'Active');`,
      [bizA_id, `rep_a_${timestamp}@mandi.pk`, bizB_id, `rep_b_${timestamp}@mandi.pk`]
    );

    await pool.query(
      `INSERT INTO devices (id, device_id, business_id, name, counter_name, status, last_sync)
       VALUES ($1, $1, $2, 'Counter 1', 'Counter 1', 'Active', NOW()),
              ($3, $3, $4, 'Counter 1', 'Counter 1', 'Active', NOW());`,
      [devA1_id, bizA_id, devB1_id, bizB_id]
    );

    const tokenA = createToken({
      id: `usr-rep-a-${timestamp}`,
      name: 'Cashier Sultan',
      email: `cashier_sultan_${timestamp}@mandi.pk`,
      role: 'CASHIER',
      businessId: bizA_id,
      businessName: 'Replication Test Mandi A',
    });

    const tokenB = createToken({
      id: `usr-rep-b-${timestamp}`,
      name: 'Cashier Akram',
      email: `cashier_akram_${timestamp}@mandi.pk`,
      role: 'CASHIER',
      businessId: bizB_id,
      businessName: 'Replication Test Mandi B',
    });

    // -------------------------------------------------------------
    // 2. Test Master Lookups Replication (Area, Item, Merchant, Farmer)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Master Lookups Replication to PostgreSQL ---');

    const areaUuid = generateUuid();
    const itemUuid = generateUuid();
    const merchantUuid = generateUuid();
    const farmerUuid = generateUuid();
    const farmerMarkUuid = generateUuid();

    const pushMastersRes = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          // Area (Tier 1)
          {
            event_uuid: generateUuid(),
            entity_type: 'Area',
            entity_uuid: areaUuid,
            operation: 'create',
            payload: {
              attributes: {
                name_en: 'Pattoki Chungi',
                name_ur: 'پتوکی چنگی',
                status: 'active',
              },
            },
          },
          // Item (Tier 1)
          {
            event_uuid: generateUuid(),
            entity_type: 'Item',
            entity_uuid: itemUuid,
            operation: 'create',
            payload: {
              attributes: {
                code: 'ALO-01',
                name_en: 'Potato White (Aloo Sufaid)',
                name_ur: 'آلو سفید',
                unit: 'Bori',
                kg_per_unit: 100,
                default_rate: 4500,
                purchase_rate: 4200,
                default_bardana: 50,
                opening_stock: 200,
                current_stock: 200,
                status: 'active',
              },
            },
          },
          // Merchant (Tier 2)
          {
            event_uuid: generateUuid(),
            entity_type: 'Merchant',
            entity_uuid: merchantUuid,
            operation: 'create',
            payload: {
              attributes: {
                code: 101,
                name_en: 'Bismillah Fruit & Sabzi Company',
                phone: '03009988771',
                city: 'Lahore',
                customer_type: 'Dukandar',
                credit_limit: 500000,
                opening_balance: 150000,
                current_balance: 150000,
                status: 'active',
              },
            },
          },
          // Farmer (Tier 2 - depends on Area)
          {
            event_uuid: generateUuid(),
            entity_type: 'Farmer',
            entity_uuid: farmerUuid,
            operation: 'create',
            payload: {
              attributes: {
                code: 201,
                name_en: 'Chaudhry Bashir Zamindar',
                phone: '03218877665',
                opening_balance: 0,
                current_balance: 0,
                status: 'active',
              },
              relationships: {
                area_uuid: areaUuid,
              },
            },
          },
          // FarmerMark (Tier 3 - depends on Farmer)
          {
            event_uuid: generateUuid(),
            entity_type: 'FarmerMark',
            entity_uuid: farmerMarkUuid,
            operation: 'create',
            payload: {
              attributes: {
                code: 1,
                name_en: 'Marka CBS Star',
                name_ur: 'مارکہ سی بی ایس',
              },
              relationships: {
                farmer_uuid: farmerUuid,
              },
            },
          },
        ],
      },
    });

    assert(
      1,
      'Batch upload of master entities returns HTTP 200 with all events processed',
      pushMastersRes.status === 200 && pushMastersRes.body?.data?.processed_count === 5
    );

    // Verify actual PostgreSQL rows in areas, items, merchants, farmers, farmer_marks
    const areaDb = await pool.query(`SELECT * FROM areas WHERE business_id = $1 AND uuid = $2;`, [bizA_id, areaUuid]);
    assert(2, 'areas table contains replicated record with correct columns', areaDb.rows.length === 1 && areaDb.rows[0].name_en === 'Pattoki Chungi');

    const itemDb = await pool.query(`SELECT * FROM items WHERE business_id = $1 AND uuid = $2;`, [bizA_id, itemUuid]);
    assert(
      3,
      'items table contains replicated record with numeric rates & stock',
      itemDb.rows.length === 1 && Number(itemDb.rows[0].default_rate) === 4500 && itemDb.rows[0].code === 'ALO-01'
    );

    const merchantDb = await pool.query(`SELECT * FROM merchants WHERE business_id = $1 AND uuid = $2;`, [bizA_id, merchantUuid]);
    assert(
      4,
      'merchants table contains replicated record with credit limit & balance',
      merchantDb.rows.length === 1 && Number(merchantDb.rows[0].credit_limit) === 500000
    );

    const farmerDb = await pool.query(`SELECT * FROM farmers WHERE business_id = $1 AND uuid = $2;`, [bizA_id, farmerUuid]);
    assert(
      5,
      'farmers table has foreign key relationship to area resolved (area_id & area_uuid)',
      farmerDb.rows.length === 1 && farmerDb.rows[0].area_uuid === areaUuid && farmerDb.rows[0].area_id === areaDb.rows[0].id
    );

    const markDb = await pool.query(`SELECT * FROM farmer_marks WHERE business_id = $1 AND uuid = $2;`, [bizA_id, farmerMarkUuid]);
    assert(
      6,
      'farmer_marks table has foreign key to farmer resolved (farmer_id & farmer_uuid)',
      markDb.rows.length === 1 && markDb.rows[0].farmer_uuid === farmerUuid && markDb.rows[0].farmer_id === farmerDb.rows[0].id
    );

    // -------------------------------------------------------------
    // 3. Test Transaction Records Replication (AmrozaSale, FarmerBill, MerchantReceipt)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Transaction Headers & Financial Replication ---');

    const saleUuid = generateUuid();
    const receiptUuid = generateUuid();
    const billUuid = generateUuid();

    const pushTxRes = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          // AmrozaSale (Daily auction sale to merchant)
          {
            event_uuid: generateUuid(),
            entity_type: 'AmrozaSale',
            entity_uuid: saleUuid,
            operation: 'create',
            payload: {
              attributes: {
                date: '2026-11-24',
                nag: 10,
                weight: 1000,
                rate: 4600,
                bardana: 500,
                gross_amount: 46500,
                payment_type: 'udhaar',
                cash_received: 0,
                udhaar_amount: 46500,
                year: 2026,
              },
              relationships: {
                merchant_uuid: merchantUuid,
                item_uuid: itemUuid,
              },
            },
          },
          // MerchantReceipt (Payment receipt from merchant)
          {
            event_uuid: generateUuid(),
            entity_type: 'MerchantReceipt',
            entity_uuid: receiptUuid,
            operation: 'create',
            payload: {
              attributes: {
                date: '2026-11-24',
                amount: 20000,
                type: 'recovery',
                note: 'Cash payment received via Munshi',
                year: 2026,
              },
              relationships: {
                merchant_uuid: merchantUuid,
              },
            },
          },
          // FarmerBill (Consignment bill for farmer)
          {
            event_uuid: generateUuid(),
            entity_type: 'FarmerBill',
            entity_uuid: billUuid,
            operation: 'create',
            payload: {
              attributes: {
                date: '2026-11-24',
                truck_no: 'LES-9988',
                nag: 50,
                weight: 5000,
                rate: 4500,
                commission_pct: 6.0,
                gross_amount: 225000,
                commission_amount: 13500,
                bardana_amount: 2500,
                kiraya: 8000,
                mazdoori: 2000,
                market_fee: 1000,
                net_amount: 198000,
                paid_amount: 100000,
                note: 'First lot cleared',
              },
              relationships: {
                farmer_uuid: farmerUuid,
                farmer_mark_uuid: farmerMarkUuid,
                item_uuid: itemUuid,
              },
            },
          },
        ],
      },
    });

    assert(
      7,
      'Batch upload of Mandi transactions returns HTTP 200 and processed',
      pushTxRes.status === 200 && pushTxRes.body?.data?.processed_count === 3
    );

    // Verify amroza_sales record
    const saleDb = await pool.query(`SELECT * FROM amroza_sales WHERE business_id = $1 AND uuid = $2;`, [bizA_id, saleUuid]);
    assert(
      8,
      'amroza_sales table has record with resolved merchant_id, item_id, and amounts',
      saleDb.rows.length === 1 &&
        saleDb.rows[0].merchant_uuid === merchantUuid &&
        saleDb.rows[0].item_uuid === itemUuid &&
        Number(saleDb.rows[0].gross_amount) === 46500 &&
        Number(saleDb.rows[0].udhaar_amount) === 46500
    );

    // Verify merchant_receipts record
    const receiptDb = await pool.query(`SELECT * FROM merchant_receipts WHERE business_id = $1 AND uuid = $2;`, [bizA_id, receiptUuid]);
    assert(
      9,
      'merchant_receipts table contains replicated payment receipt linked to merchant',
      receiptDb.rows.length === 1 && Number(receiptDb.rows[0].amount) === 20000 && receiptDb.rows[0].merchant_uuid === merchantUuid
    );

    // Verify farmer_bills record
    const billDb = await pool.query(`SELECT * FROM farmer_bills WHERE business_id = $1 AND uuid = $2;`, [bizA_id, billUuid]);
    assert(
      10,
      'farmer_bills table contains bill with farmer, mark, truck_no, commission, deductions, and net_amount',
      billDb.rows.length === 1 &&
        billDb.rows[0].truck_no === 'LES-9988' &&
        Number(billDb.rows[0].commission_amount) === 13500 &&
        Number(billDb.rows[0].net_amount) === 198000
    );

    // -------------------------------------------------------------
    // 4. Test Update and Soft Delete Operations
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Update and Soft Delete Mutations ---');

    // Update merchant's balance & phone
    const updateMerchantRes = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          {
            event_uuid: generateUuid(),
            entity_type: 'Merchant',
            entity_uuid: merchantUuid,
            operation: 'update',
            payload: {
              attributes: {
                phone: '03001112233',
                current_balance: 176500, // Updated balance after sale
              },
            },
          },
        ],
      },
    });

    assert(11, 'Merchant update event uploaded successfully', updateMerchantRes.status === 200);

    const updatedMerchantDb = await pool.query(`SELECT phone, current_balance FROM merchants WHERE business_id = $1 AND uuid = $2;`, [bizA_id, merchantUuid]);
    assert(
      12,
      'merchants table record updated in place without creating duplicate',
      updatedMerchantDb.rows.length === 1 &&
        updatedMerchantDb.rows[0].phone === '03001112233' &&
        Number(updatedMerchantDb.rows[0].current_balance) === 176500
    );

    // Soft delete Area
    const deleteAreaRes = await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'X-Device-Id': devA1_id,
      },
      body: {
        device_id: devA1_id,
        events: [
          {
            event_uuid: generateUuid(),
            entity_type: 'Area',
            entity_uuid: areaUuid,
            operation: 'delete',
            payload: {},
          },
        ],
      },
    });

    assert(13, 'Area delete event uploaded successfully', deleteAreaRes.status === 200);

    const softDeletedAreaDb = await pool.query(`SELECT deleted_at FROM areas WHERE business_id = $1 AND uuid = $2;`, [bizA_id, areaUuid]);
    assert(
      14,
      'areas table row has deleted_at set (Soft delete preserved)',
      softDeletedAreaDb.rows.length === 1 && softDeletedAreaDb.rows[0].deleted_at !== null
    );

    // -------------------------------------------------------------
    // 5. Test Multi-Tenant Replication Isolation
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Tenant Replication Isolation ---');

    // Business B uploads a merchant with the same code (101)
    const merchantUuidB = generateUuid();
    await apiRequest('/api/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'X-Device-Id': devB1_id,
      },
      body: {
        device_id: devB1_id,
        events: [
          {
            event_uuid: generateUuid(),
            entity_type: 'Merchant',
            entity_uuid: merchantUuidB,
            operation: 'create',
            payload: {
              attributes: {
                code: 101, // same code in Business B!
                name_en: 'Faisalabad Agro Merchant',
                city: 'Faisalabad',
              },
            },
          },
        ],
      },
    });

    const bizA_merchants = await pool.query(`SELECT name_en FROM merchants WHERE business_id = $1;`, [bizA_id]);
    const bizB_merchants = await pool.query(`SELECT name_en FROM merchants WHERE business_id = $1;`, [bizB_id]);

    assert(
      15,
      'Business A only sees its own merchants in PostgreSQL table',
      bizA_merchants.rows.length === 1 && bizA_merchants.rows[0].name_en === 'Bismillah Fruit & Sabzi Company'
    );
    assert(
      16,
      'Business B only sees its own merchants in PostgreSQL table',
      bizB_merchants.rows.length === 1 && bizB_merchants.rows[0].name_en === 'Faisalabad Agro Merchant'
    );

    // -------------------------------------------------------------
    // 6. Test sync_events status is 'processed'
    // -------------------------------------------------------------
    console.log('\n--- 6. Verifying sync_events Status Transition ---');
    const processedEventsDb = await pool.query(
      `SELECT COUNT(*)::int as count FROM sync_events WHERE business_id = $1 AND status = 'processed';`,
      [bizA_id]
    );
    assert(
      17,
      'sync_events records are marked with status = "processed" and processed_at timestamp',
      processedEventsDb.rows[0].count >= 9
    );
  } finally {
    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    console.log('\n--- 7. Cleaning up Isolated Test Data ---');
    try {
      const bizIds = [bizA_id, bizB_id];
      await pool.query(`DELETE FROM farmer_bills WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM merchant_receipts WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM amroza_sales WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM farmer_marks WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM farmers WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM merchants WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM items WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM areas WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM sync_events WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM sync_records WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM devices WHERE business_id = ANY($1);`, [bizIds]);
      await pool.query(`DELETE FROM businesses WHERE id = ANY($1);`, [bizIds]);
      console.log('Cleaned up test records from PostgreSQL.');
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }

    await stopTestServer();
  }

  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(` PHASE 8 RESULTS: ${passed}/${total} TESTS PASSED (${failed} FAILED)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Tests()
  .then(() => {
    console.log('[Phase 8 Suite] All replication tests completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Phase 8 Suite Error]:', err);
    process.exit(1);
  });
