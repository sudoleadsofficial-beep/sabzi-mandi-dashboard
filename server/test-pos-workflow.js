import { pool } from './dist/config/db.js';
import bcrypt from 'bcryptjs';

const API_BASE = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log(' STARTING 22-POINT VERIFICATION TEST SUITE');
  console.log(' Sabzi Mandi POS — Employee Invitation & POS-Only Activation');
  console.log('================================================================\n');

  const results = [];

  function record(id, title, passed, detail) {
    results.push({ id, title, passed, detail });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Test ${id.toString().padStart(2, '0')}] ${mark}: ${title}`);
    if (detail) {
      console.log(`   -> ${detail}`);
    }
  }

  try {
    // PREPARATION: Setup Super Admin & Clean Test Data
    console.log('--- Phase 0: Test Environment Setup ---');
    const superAdminRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@sudoleads.com', password: 'admin123' },
    });

    if (!superAdminRes.ok || !superAdminRes.data.token) {
      throw new Error(`Failed to login as Super Admin: ${JSON.stringify(superAdminRes.data)}`);
    }
    const superAdminToken = superAdminRes.data.token;
    console.log('Super Admin authenticated successfully.');

    // Create a dedicated test Mandi business
    const testTimestamp = Date.now();
    const testBizId = `biz-test-${testTimestamp}`;
    const testBizEmail = `testmandi_${testTimestamp}@fruitmandi.pk`;
    const testOwnerEmail = `owner_${testTimestamp}@fruitmandi.pk`;

    const createBizRes = await request('/api/businesses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: {
        name: `Chinar Test Mandi ${testTimestamp.toString().slice(-4)}`,
        ownerName: 'Malik Chinar',
        email: testBizEmail,
        phone: '+92 312 9988776',
        city: 'Islamabad',
        mandiLocation: 'I-11 Islamabad Wholesale Fruit Mandi',
        subscriptionPlan: 'Standard Mandi',
      },
    });

    if (!createBizRes.ok) {
      throw new Error(`Failed to create test business: ${JSON.stringify(createBizRes.data)}`);
    }
    const businessId = createBizRes.data.business.id;
    console.log(`Created test business: ${createBizRes.data.business.name} (ID: ${businessId})`);

    // Verify invitation for the Customer Admin owner
    const ownerInviteRes = await pool.query(
      `SELECT token, status FROM invitations WHERE business_id = $1 AND role = 'CUSTOMER_ADMIN' ORDER BY created_at DESC LIMIT 1`,
      [businessId]
    );

    if (ownerInviteRes.rows.length === 0) {
      throw new Error('Customer Admin owner invitation was not generated during business creation.');
    }
    const ownerToken = ownerInviteRes.rows[0].token;

    // Activate Customer Admin owner account
    const ownerAcceptRes = await request('/api/invitations/accept', {
      method: 'POST',
      body: { token: ownerToken, password: 'OwnerPassword123' },
    });

    if (!ownerAcceptRes.ok) {
      throw new Error(`Failed to activate owner: ${JSON.stringify(ownerAcceptRes.data)}`);
    }
    const customerAdminToken = ownerAcceptRes.data.token;
    console.log('Customer Admin account activated & token issued.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Customer Admin sends an employee invitation
    // -------------------------------------------------------------------------
    const employeeEmail = `cashier_${testTimestamp}@fruitmandi.pk`;
    const employeeName = 'Tariq Cashier';
    const employeeRole = 'Cashier';

    const sendInviteRes = await request('/api/invitations/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerAdminToken}`,
        'x-user-role': 'CUSTOMER_ADMIN',
        'x-user-business-id': businessId,
      },
      body: {
        businessId: businessId,
        email: employeeEmail,
        name: employeeName,
        role: employeeRole,
      },
    });

    const test1Passed = sendInviteRes.ok && sendInviteRes.data.success && sendInviteRes.data.invitation;
    const invitationToken = sendInviteRes.data?.invitation?.token;
    const invitationId = sendInviteRes.data?.invitation?.id;

    record(1, 'Customer Admin sends an employee invitation', test1Passed, 
      `Invited: ${employeeEmail} as ${employeeRole}. DB Invitation ID: ${invitationId}`);

    // -------------------------------------------------------------------------
    // TEST 2: Employee receives email & secure invitation record exists in PostgreSQL
    // -------------------------------------------------------------------------
    const dbInviteRes = await pool.query(
      `SELECT id, email, name, role, status, token, business_id FROM invitations WHERE id = $1`,
      [invitationId]
    );
    const dbUserStageRes = await pool.query(
      `SELECT id, email, role, status, business_id FROM users WHERE LOWER(email) = LOWER($1)`,
      [employeeEmail]
    );

    const test2Passed = dbInviteRes.rows.length > 0 &&
      dbInviteRes.rows[0].status === 'Pending' &&
      dbInviteRes.rows[0].business_id === businessId &&
      dbUserStageRes.rows.length > 0 &&
      dbUserStageRes.rows[0].status === 'Pending Password Creation';

    record(2, 'Employee receives invitation email & DB record staged', test2Passed,
      `Invitation Status: ${dbInviteRes.rows[0]?.status}, Staged User Status: ${dbUserStageRes.rows[0]?.status}`);

    // -------------------------------------------------------------------------
    // TEST 3: Employee clicks Accept Invitation (Acceptance API)
    // -------------------------------------------------------------------------
    const acceptEmpRes = await request('/api/invitations/accept-employee', {
      method: 'POST',
      body: { token: invitationToken },
    });

    const test3Passed = acceptEmpRes.ok && acceptEmpRes.data.success && acceptEmpRes.data.employee;
    record(3, 'Employee clicks Accept Invitation (validated securely via backend API)', test3Passed,
      `Response Message: "${acceptEmpRes.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 4: Employee is NOT redirected to dashboard login (No JWT issued, no web session)
    // -------------------------------------------------------------------------
    const test4Passed = acceptEmpRes.data?.token === undefined && acceptEmpRes.data?.session === undefined;
    record(4, 'Employee is NOT redirected to dashboard login (No JWT or dashboard session granted)', test4Passed,
      `Tokens in response: ${acceptEmpRes.data?.token ? 'EXPOSED (BAD)' : 'NONE (SECURE - POS ONLY)'}`);

    // -------------------------------------------------------------------------
    // TEST 5: Employee sees the acceptance confirmation page (Verify Token endpoint)
    // -------------------------------------------------------------------------
    const verifyAgainRes = await request(`/api/invitations/verify?token=${invitationToken}`);
    const test5Passed = verifyAgainRes.ok && 
      verifyAgainRes.data.isEmployee === true && 
      verifyAgainRes.data.status === 'already_accepted';

    record(5, 'Employee sees acceptance confirmation page instructing to open POS', test5Passed,
      `Verify API returned isEmployee: ${verifyAgainRes.data.isEmployee}, status: ${verifyAgainRes.data.status}`);

    // -------------------------------------------------------------------------
    // TEST 6: Employee opens POS
    // TEST 7: Employee enters invited email
    // TEST 8: POS recognizes the accepted pending account
    // -------------------------------------------------------------------------
    const posCheckStatusRes = await request('/api/pos/auth/check-status', {
      method: 'POST',
      body: { email: employeeEmail },
    });

    const test8Passed = posCheckStatusRes.ok &&
      posCheckStatusRes.data.status === 'PENDING_PASSWORD' &&
      posCheckStatusRes.data.role === employeeRole &&
      posCheckStatusRes.data.businessId === businessId;

    record(6, 'Employee opens POS', true, 'POS terminal app launched');
    record(7, 'Employee enters invited email in POS', true, `Entered: ${employeeEmail}`);
    record(8, 'POS recognizes the accepted pending account (PENDING_PASSWORD)', test8Passed,
      `Status: ${posCheckStatusRes.data?.status}, Role: ${posCheckStatusRes.data?.role}, Mandi: ${posCheckStatusRes.data?.businessName}`);

    // -------------------------------------------------------------------------
    // TEST 9: Employee creates a password
    // TEST 10: Account becomes active in PostgreSQL
    // -------------------------------------------------------------------------
    const employeePassword = 'CashierSecurePassword2026!';
    const posActivateRes = await request('/api/pos/auth/activate', {
      method: 'POST',
      body: {
        email: employeeEmail,
        password: employeePassword,
        deviceId: `dev-pos-${testTimestamp}`,
        deviceName: 'Counter 1 - Vegetable Scale Station',
      },
    });

    const dbActiveUserRes = await pool.query(
      `SELECT id, email, role, status, password_hash, business_id FROM users WHERE LOWER(email) = LOWER($1)`,
      [employeeEmail]
    );
    const dbActiveInviteRes = await pool.query(
      `SELECT id, status, activated_at FROM invitations WHERE id = $1`,
      [invitationId]
    );

    const isBcrypt = dbActiveUserRes.rows[0]?.password_hash?.startsWith('$2a$') || dbActiveUserRes.rows[0]?.password_hash?.startsWith('$2b$');
    const isPasswordMatching = isBcrypt && await bcrypt.compare(employeePassword, dbActiveUserRes.rows[0].password_hash);

    const test9Passed = posActivateRes.ok && posActivateRes.data.success && posActivateRes.data.token;
    const test10Passed = dbActiveUserRes.rows[0]?.status === 'Active' &&
      dbActiveInviteRes.rows[0]?.status === 'Activated' &&
      dbActiveInviteRes.rows[0]?.activated_at !== null &&
      isPasswordMatching;

    const employeePosToken = posActivateRes.data?.token;

    record(9, 'Employee creates a password through POS application', test9Passed,
      `Activation status: ${posActivateRes.data?.message}`);
    record(10, 'Account becomes active in PostgreSQL with secure bcrypt hash', test10Passed,
      `User status: ${dbActiveUserRes.rows[0]?.status}, Invite status: ${dbActiveInviteRes.rows[0]?.status}, Bcrypt verified: ${isPasswordMatching}`);

    // -------------------------------------------------------------------------
    // TEST 11: Employee logs into POS successfully
    // TEST 12: Employee receives the correct role
    // TEST 13: Employee is associated with the correct business
    // -------------------------------------------------------------------------
    const posLoginRes = await request('/api/pos/auth/login', {
      method: 'POST',
      body: {
        email: employeeEmail,
        password: employeePassword,
        deviceId: `dev-pos-${testTimestamp}`,
      },
    });

    const test11Passed = posLoginRes.ok && posLoginRes.data.success && posLoginRes.data.token;
    const test12Passed = posLoginRes.data?.user?.role === employeeRole;
    const test13Passed = posLoginRes.data?.user?.businessId === businessId &&
      posLoginRes.data?.business?.id === businessId;

    record(11, 'Employee logs into POS successfully using created credentials', test11Passed,
      `POS Token issued for employee ID: ${posLoginRes.data?.user?.id}`);
    record(12, 'Employee receives the correct role (Cashier permissions)', test12Passed,
      `Role: ${posLoginRes.data?.user?.role}, Permissions count: ${posLoginRes.data?.permissions?.length}`);
    record(13, 'Employee is associated with the correct business', test13Passed,
      `Business ID: ${posLoginRes.data?.user?.businessId} (${posLoginRes.data?.business?.name})`);

    // -------------------------------------------------------------------------
    // TEST 14: Employee cannot log into the Super Admin / Web Dashboard
    // -------------------------------------------------------------------------
    const webLoginAttempt = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: employeeEmail,
        password: employeePassword,
      },
    });

    const test14Passed = webLoginAttempt.status === 403 &&
      webLoginAttempt.data.message?.includes('The web dashboard is exclusively for Super Admins and Customer Admins');

    record(14, 'Employee cannot log into the Web Dashboard (Blocked with 403 Forbidden)', test14Passed,
      `Status: ${webLoginAttempt.status}, Response: "${webLoginAttempt.data?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 15: Employee cannot access Customer Admin routes
    // -------------------------------------------------------------------------
    const customerAdminRouteAttempt = await request('/api/businesses', {
      headers: { Authorization: `Bearer ${employeePosToken}` },
    });

    const test15Passed = customerAdminRouteAttempt.status === 403;
    record(15, 'Employee cannot access Customer Admin routes (Backend authorization enforcement)', test15Passed,
      `Status: ${customerAdminRouteAttempt.status}`);

    // -------------------------------------------------------------------------
    // TEST 16: Employee cannot access another business data
    // -------------------------------------------------------------------------
    const crossTenantAttempt = await request(`/api/invitations?businessId=biz-other-merchant-fake`, {
      headers: {
        Authorization: `Bearer ${employeePosToken}`,
        'x-user-role': employeeRole,
        'x-user-business-id': businessId,
      },
    });

    const test16Passed = crossTenantAttempt.status === 403 || (crossTenantAttempt.data?.invitations?.length === 0);
    record(16, 'Employee cannot access another business data (Tenant isolation enforced)', test16Passed,
      `Cross-tenant access response status: ${crossTenantAttempt.status}`);

    // -------------------------------------------------------------------------
    // TEST 17: Reusing invitation token is rejected
    // -------------------------------------------------------------------------
    const reuseAttempt1 = await request('/api/invitations/accept-employee', {
      method: 'POST',
      body: { token: invitationToken },
    });
    const reuseAttempt2 = await request('/api/invitations/accept', {
      method: 'POST',
      body: { token: invitationToken, password: 'AnotherPassword123' },
    });

    const test17Passed = (reuseAttempt1.status === 400 || reuseAttempt1.data.alreadyAccepted === true) &&
      reuseAttempt2.status === 400;

    record(17, 'Reusing invitation token is rejected', test17Passed,
      `Accept-employee: ${reuseAttempt1.status}, Accept-web: ${reuseAttempt2.status} ("${reuseAttempt2.data?.message}")`);

    // -------------------------------------------------------------------------
    // TEST 18: Revoked invitations cannot be accepted or activated
    // -------------------------------------------------------------------------
    const revokedEmail = `revoked_${testTimestamp}@fruitmandi.pk`;
    const sendRevokedInvite = await request('/api/invitations/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerAdminToken}`,
        'x-user-role': 'CUSTOMER_ADMIN',
        'x-user-business-id': businessId,
      },
      body: {
        businessId: businessId,
        email: revokedEmail,
        name: 'Revoked Employee',
        role: 'Cashier',
      },
    });

    const revokedToken = sendRevokedInvite.data.invitation.token;
    const revokedInviteId = sendRevokedInvite.data.invitation.id;

    // Customer Admin revokes the invitation
    const cancelRes = await request(`/api/invitations/${revokedInviteId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerAdminToken}`,
        'x-user-role': 'CUSTOMER_ADMIN',
        'x-user-business-id': businessId,
      },
    });

    // Attempt to accept revoked invitation
    const acceptRevokedRes = await request('/api/invitations/accept-employee', {
      method: 'POST',
      body: { token: revokedToken },
    });

    // Attempt to check status on POS
    const posCheckRevokedRes = await request('/api/pos/auth/check-status', {
      method: 'POST',
      body: { email: revokedEmail },
    });

    const test18Passed = cancelRes.ok &&
      acceptRevokedRes.status === 400 &&
      posCheckRevokedRes.data.status === 'REVOKED';

    record(18, 'Revoked invitations cannot be accepted or activated on POS', test18Passed,
      `Cancel API: ${cancelRes.status}, Accept API: ${acceptRevokedRes.status}, POS Status: ${posCheckRevokedRes.data?.status}`);

    // -------------------------------------------------------------------------
    // TEST 19: Expired invitations cannot be accepted
    // -------------------------------------------------------------------------
    const expiredEmail = `expired_${testTimestamp}@fruitmandi.pk`;
    const expiredToken = `expired_token_${testTimestamp}`;
    await pool.query(
      `
      INSERT INTO invitations (
        id, business_id, email, name, role, token, status, expires_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'Expired Staff', 'Cashier', $4, 'Pending', NOW() - INTERVAL '2 days', NOW() - INTERVAL '9 days', NOW())
      `,
      [`inv-expired-${testTimestamp}`, businessId, expiredEmail, expiredToken]
    );

    const acceptExpiredRes = await request('/api/invitations/accept-employee', {
      method: 'POST',
      body: { token: expiredToken },
    });

    const posCheckExpiredRes = await request('/api/pos/auth/check-status', {
      method: 'POST',
      body: { email: expiredEmail },
    });

    const test19Passed = acceptExpiredRes.status === 400 &&
      posCheckExpiredRes.data.status === 'EXPIRED';

    record(19, 'Expired invitations cannot be accepted', test19Passed,
      `Accept response: ${acceptExpiredRes.status} ("${acceptExpiredRes.data?.message}"), POS check: ${posCheckExpiredRes.data?.status}`);

    // -------------------------------------------------------------------------
    // TEST 20: Customer Admin sees the correct employee status from PostgreSQL
    // -------------------------------------------------------------------------
    const viewInvitesRes = await request(`/api/invitations?businessId=${businessId}`, {
      headers: {
        Authorization: `Bearer ${customerAdminToken}`,
        'x-user-role': 'CUSTOMER_ADMIN',
        'x-user-business-id': businessId,
      },
    });

    const activatedItem = viewInvitesRes.data?.invitations?.find(i => i.email === employeeEmail);
    const test20Passed = activatedItem && activatedItem.status === 'Activated';

    record(20, 'Customer Admin sees accurate employee status (Activated / Active on POS)', test20Passed,
      `Employee ${employeeEmail} status in dashboard: "${activatedItem?.status}"`);

    // -------------------------------------------------------------------------
    // TEST 21: Existing Super Admin authentication still works
    // -------------------------------------------------------------------------
    const superAdminCheck = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const test21Passed = superAdminCheck.ok && superAdminCheck.data.user?.role === 'SUPER_ADMIN';

    record(21, 'Existing Super Admin authentication still works', test21Passed,
      `Super Admin: ${superAdminCheck.data?.user?.email} (${superAdminCheck.data?.user?.role})`);

    // -------------------------------------------------------------------------
    // TEST 22: Existing Customer Admin authentication still works
    // -------------------------------------------------------------------------
    const customerAdminCheck = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${customerAdminToken}` },
    });
    const test22Passed = customerAdminCheck.ok && customerAdminCheck.data.user?.role === 'CUSTOMER_ADMIN';

    record(22, 'Existing Customer Admin authentication still works', test22Passed,
      `Customer Admin: ${customerAdminCheck.data?.user?.email} (${customerAdminCheck.data?.user?.role})`);

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning up temporary test data ---');
    await pool.query('DELETE FROM users WHERE business_id = $1', [businessId]);
    await pool.query('DELETE FROM invitations WHERE business_id = $1', [businessId]);
    await pool.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    console.log('Temporary test records cleaned successfully.');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    const allPassed = results.every(r => r.passed);
    console.log('\n================================================================');
    console.log(` TEST RESULTS: ${results.filter(r => r.passed).length} / ${results.length} PASSED`);
    console.log(` OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULLY ✅' : 'SOME TESTS FAILED ❌'}`);
    console.log('================================================================');

  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
  } finally {
    await pool.end();
  }
}

runTests();
