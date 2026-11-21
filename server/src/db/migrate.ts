import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('[Migration] Starting database migration & schema initialization...');

    await client.query('BEGIN');

    // 1. Migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Businesses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        city VARCHAR(100),
        mandi_location VARCHAR(255),
        address TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Users table with secure password_hash and attribution columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        phone VARCHAR(50),
        created_by_id VARCHAR(64),
        created_by_name VARCHAR(255),
        created_by_role VARCHAR(64),
        last_active TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure attribution columns exist if table was created previously
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(64);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
    `);

    // 4. Invitations table with attribution and role support
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR(64) PRIMARY KEY,
        business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER_ADMIN',
        token VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        invited_by_id VARCHAR(64),
        invited_by_name VARCHAR(255),
        invited_by_role VARCHAR(64),
        email_sent BOOLEAN DEFAULT FALSE,
        email_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure invitation attribution columns exist if table was created previously
    await client.query(`
      ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by_id VARCHAR(64);
      ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by_name VARCHAR(255);
      ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by_role VARCHAR(64);
      ALTER TABLE invitations ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
      CREATE INDEX IF NOT EXISTS idx_invitations_business ON invitations(business_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
    `);

    // 5. Seed Super Admin user (password: admin123)
    const saltRounds = 10;
    const superAdminHash = await bcrypt.hash('admin123', saltRounds);
    await client.query(`
      INSERT INTO users (id, business_id, name, email, password_hash, role, status, created_by_name, created_by_role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Platform System', 'SUPER_ADMIN')
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        created_by_name = COALESCE(users.created_by_name, 'Platform System'),
        created_by_role = COALESCE(users.created_by_role, 'SUPER_ADMIN'),
        updated_at = NOW();
    `, [
      'usr-superadmin',
      null,
      'SudoLeads Super Admin',
      'admin@sudoleads.com',
      superAdminHash,
      'SUPER_ADMIN',
      'Active'
    ]);

    // 6. Migration 004: Notifications, Audit Logs, Devices, Sync Records, and Business Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        recipient_id VARCHAR(64),
        recipient_role VARCHAR(50),
        business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_business ON notifications(business_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        actor_id VARCHAR(64),
        actor_name VARCHAR(255) NOT NULL,
        actor_role VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_entity VARCHAR(100),
        target_id VARCHAR(64),
        business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE SET NULL,
        business_name VARCHAR(255),
        details TEXT,
        category VARCHAR(50) NOT NULL,
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

      CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(64) PRIMARY KEY,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE CASCADE,
        counter_name VARCHAR(100),
        app_version VARCHAR(50) DEFAULT 'v2.4.1',
        status VARCHAR(50) DEFAULT 'Active',
        last_sync TIMESTAMPTZ,
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_devices_business ON devices(business_id);

      CREATE TABLE IF NOT EXISTS sync_records (
        id VARCHAR(64) PRIMARY KEY,
        device_id VARCHAR(64) REFERENCES devices(id) ON DELETE CASCADE,
        business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        pending_records INT DEFAULT 0,
        failed_records INT DEFAULT 0,
        error_message TEXT,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sync_records_business ON sync_records(business_id);

      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS commission_rate VARCHAR(50) DEFAULT '6.0%';
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ntn VARCHAR(50);
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS strn VARCHAR(50);
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS established_year VARCHAR(20);
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS total_counters INT DEFAULT 1;

      -- Seed realistic base audit entries if table empty
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, business_id, business_name, details, category, created_at)
      SELECT 'audit-init-01', 'usr-superadmin', 'SudoLeads Super Admin', 'SUPER_ADMIN', 'Platform Initialized', NULL, 'Platform Wide', 'Platform centralized control tower initialized and connected to PostgreSQL database.', 'Security', NOW() - INTERVAL '2 days'
      WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE id = 'audit-init-01');

      -- Seed realistic initial notifications if table empty
      INSERT INTO notifications (id, recipient_id, recipient_role, business_id, title, message, type, is_read, created_at)
      SELECT 'notif-init-01', NULL, 'SUPER_ADMIN', NULL, 'Platform Gateway Operational', 'PostgreSQL database and Brevo SMTP mail service are fully connected.', 'success', false, NOW() - INTERVAL '1 day'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE id = 'notif-init-01');
    `);

    // Record migration in migrations table
    await client.query(`
      INSERT INTO migrations (name)
      VALUES ('004_notifications_audit_devices_settings')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[Migration] Database migration & seeding completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow running directly via `npm run migrate`
if (process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Migration script finished. Exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Migration script error:', err);
      process.exit(1);
    });
}
