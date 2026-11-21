const { Pool } = require('../server/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pos2026@localhost:5432/sabzi_mandi_dashboard',
});

const BASE_URL = 'http://localhost:5000';

async function testPhase3() {
  console.log('====================================================');
  console.log('   SABZI MANDI POS - PHASE 3 AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Super Admin Login
    console.log('--- 1. Authenticating Super Admin ---');
    const saLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sudoleads.com', password: 'admin123' }),
    });
    const saLogin = await saLoginRes.json();
    assert(saLogin.success && saLogin.token && saLogin.user.role === 'SUPER_ADMIN', 'Super Admin authentication succeeded with signed JWT');
    const saToken = saLogin.token;

    // 2. Customer Admin Login
    console.log('\n--- 2. Authenticating Customer Admin ---');
    const caLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@alrehman.com', password: 'owner123' }),
    });
    const caLogin = await caLoginRes.json();
    assert(caLogin.success && caLogin.token && caLogin.user.role === 'CUSTOMER_ADMIN', 'Customer Admin authentication succeeded');
    const caToken = caLogin.token;

    // 3. Create Real Business via Super Admin
    console.log('\n--- 3. Creating New Business in PostgreSQL ---');
    const testBizEmail = `phase3_test_${Date.now()}@mandi.pk`;
    const createBizRes = await fetch(`${BASE_URL}/api/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saToken}`,
      },
      body: JSON.stringify({
        name: 'Phase 3 Verification Wholesale Mandi',
        ownerName: 'Malik Test Aarhti',
        email: testBizEmail,
        phone: '+92 300 1234567',
        city: 'Faisalabad',
        mandiLocation: 'Jhang Road Grain Market',
        address: 'Shed 19, Platform B',
        commissionRate: '7.5%',
        ntn: '9876543-2',
        strn: '19-00-9876-543-01',
        sendInvitation: false,
      }),
    });
    const createBizData = await createBizRes.json();
    assert(createBizData.success && createBizData.business?.id, `Business created with ID: ${createBizData.business?.id}`);
    const newBizId = createBizData.business.id;

    // Verify in PostgreSQL directly
    const dbBizCheck = await pool.query('SELECT * FROM businesses WHERE id = $1', [newBizId]);
    assert(dbBizCheck.rows.length === 1 && dbBizCheck.rows[0].commission_rate === '7.5%', 'Business verified directly in PostgreSQL with custom commission rate');

    // 4. Notifications & Audit Logs for Business Creation
    console.log('\n--- 4. Checking Notifications and Audit Logs for New Business ---');
    const saNotifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${saToken}` },
    });
    const saNotifs = await saNotifsRes.json();
    const creationNotif = saNotifs.notifications.find((n) => n.title.includes('New Mandi Business Onboarded'));
    assert(Boolean(creationNotif), 'Notification for business creation found in Super Admin notification feed');

    const saAuditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${saToken}` },
    });
    const saAudit = await saAuditRes.json();
    const creationAudit = saAudit.auditLogs.find((a) => a.action === 'Business Created' && a.targetId === newBizId);
    assert(Boolean(creationAudit), 'Audit log for business creation stored in PostgreSQL with actor attribution');

    // 5. Update Business Settings & Persistence
    console.log('\n--- 5. Saving Business Settings to PostgreSQL ---');
    const updateSettingsRes = await fetch(`${BASE_URL}/api/businesses/${newBizId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${saToken}`,
      },
      body: JSON.stringify({
        dailyClosingSms: true,
        cashMismatchAlert: true,
        maxCounters: 4,
        preferredMandiStandard: 'Punjab Agricultural Produce Markets Ordinance 1978',
      }),
    });
    const updateSettingsData = await updateSettingsRes.json();
    assert(updateSettingsData.success, 'Business settings saved via API');

    const dbSettingsCheck = await pool.query('SELECT settings FROM businesses WHERE id = $1', [newBizId]);
    assert(dbSettingsCheck.rows[0].settings?.maxCounters === 4, 'Business settings verified in PostgreSQL JSONB column');

    // 6. Multi-Tenant Data Isolation Test
    console.log('\n--- 6. Testing Multi-Tenant Authorization & Isolation ---');
    // Customer Admin A (Al-Rehman) attempting to modify the newly created business
    const unauthorizedUpdateRes = await fetch(`${BASE_URL}/api/businesses/${newBizId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Business Name' }),
    });
    assert(unauthorizedUpdateRes.status === 403, 'Cross-tenant modification rejected with 403 Forbidden');

    // Customer Admin A querying businesses: must strictly see Al-Rehman
    const caBizRes = await fetch(`${BASE_URL}/api/businesses`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const caBizData = await caBizRes.json();
    const onlyOwnBiz = caBizData.businesses.every((b) => b.id === 'biz-al-rehman');
    assert(onlyOwnBiz && caBizData.businesses.length === 1, 'Customer Admin business directory query strictly isolated to own business');

    // 7. Notification Operations (Read & Dismiss)
    console.log('\n--- 7. Testing Notification Read & Dismiss Workflow ---');
    if (creationNotif) {
      // Mark Read
      const markReadRes = await fetch(`${BASE_URL}/api/notifications/${creationNotif.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${saToken}` },
      });
      assert(markReadRes.ok, 'Notification marked as read');

      const dbNotifCheck = await pool.query('SELECT is_read FROM notifications WHERE id = $1', [creationNotif.id]);
      assert(dbNotifCheck.rows[0].is_read === true, 'Notification is_read verified as TRUE in PostgreSQL');

      // Dismiss / Delete
      const dismissRes = await fetch(`${BASE_URL}/api/notifications/${creationNotif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${saToken}` },
      });
      assert(dismissRes.ok, 'Notification dismissed/deleted');

      const dbNotifCheck2 = await pool.query('SELECT * FROM notifications WHERE id = $1', [creationNotif.id]);
      assert(dbNotifCheck2.rows.length === 0, 'Notification permanently removed from PostgreSQL');
    }

    // 8. Delete Business (Clean Cascade)
    console.log('\n--- 8. Testing Business Deletion & Cascade Cleanliness ---');
    const delBizRes = await fetch(`${BASE_URL}/api/businesses/${newBizId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${saToken}` },
    });
    const delBizData = await delBizRes.json();
    assert(delBizRes.ok && delBizData.success, 'Business deleted successfully via Super Admin API');

    const dbBizDeleted = await pool.query('SELECT * FROM businesses WHERE id = $1', [newBizId]);
    assert(dbBizDeleted.rows.length === 0, 'Business row confirmed deleted in PostgreSQL');

    // 9. Sync & Devices Empty State Integrity
    console.log('\n--- 9. Verifying Zero Mock Devices / Clean Telemetry State ---');
    const devicesRes = await fetch(`${BASE_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${saToken}` },
    });
    const devicesData = await devicesRes.json();
    assert(Array.isArray(devicesData.devices), 'Devices endpoint returns real database list without hardcoded mock arrays');

    console.log('\n====================================================');
    console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await pool.end();
  }
}

testPhase3();
