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

    // 7. Migration 005: Central Synchronization Event Storage & Device Metadata
    await client.query(`
      -- Ensure devices table supports desktop device metadata
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS hostname VARCHAR(120);
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS os VARCHAR(60);
      ALTER TABLE devices ADD COLUMN IF NOT EXISTS metadata JSONB;

      -- Central Synchronization Event Storage table
      CREATE TABLE IF NOT EXISTS sync_events (
        id BIGSERIAL PRIMARY KEY,
        event_uuid VARCHAR(64) UNIQUE NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        device_id VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_uuid VARCHAR(64) NOT NULL,
        operation VARCHAR(20) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'received',
        error_message TEXT,
        event_timestamp TIMESTAMPTZ,
        received_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      -- Index for cursor-based pull pagination per tenant
      CREATE INDEX IF NOT EXISTS idx_sync_events_biz_id ON sync_events(business_id, id ASC);

      -- Index for device filtering and tracking
      CREATE INDEX IF NOT EXISTS idx_sync_events_biz_device ON sync_events(business_id, device_id);

      -- Index for entity-level tracking
      CREATE INDEX IF NOT EXISTS idx_sync_events_entity ON sync_events(business_id, entity_type, entity_uuid);

      -- Index for status filtering
      CREATE INDEX IF NOT EXISTS idx_sync_events_status ON sync_events(status);

      -- Unique constraint on sync_records per device and business for clean telemetry upserts
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_records_device_biz ON sync_records(device_id, business_id);
    `);

    await client.query(`
      INSERT INTO migrations (name)
      VALUES ('005_central_sync_events_storage')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 8. Migration 006: Central POS Business Data Replication Schema (Phase 8)
    await client.query(`
      -- Tier 1: Independent master lookups & financial
      CREATE TABLE IF NOT EXISTS areas (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name_en VARCHAR(255),
        name_ur VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_areas_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_areas_biz ON areas(business_id);

      CREATE TABLE IF NOT EXISTS items (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        code VARCHAR(50),
        name_en VARCHAR(255),
        name_ur VARCHAR(255),
        unit VARCHAR(50) DEFAULT 'Nag',
        kg_per_unit NUMERIC(8, 2),
        default_rate NUMERIC(10, 2),
        purchase_rate NUMERIC(10, 2),
        discount_rate NUMERIC(10, 2),
        default_bardana NUMERIC(10, 2),
        shelf_life VARCHAR(100),
        shelf_life_days INTEGER,
        expiry_at TIMESTAMPTZ,
        opening_stock INTEGER DEFAULT 0,
        current_stock INTEGER DEFAULT 0,
        low_stock_alert INTEGER DEFAULT 10,
        lot_date VARCHAR(50),
        stock_note VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_items_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_items_biz ON items(business_id);

      CREATE TABLE IF NOT EXISTS investment_partners (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        name_ur VARCHAR(255),
        role VARCHAR(50) DEFAULT 'partner',
        phone VARCHAR(50),
        profit_percentage NUMERIC(5, 2) DEFAULT 0,
        opening_capital NUMERIC(14, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_investment_partners_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_investment_partners_biz ON investment_partners(business_id);

      CREATE TABLE IF NOT EXISTS investment_loans (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        lender_name VARCHAR(255) NOT NULL,
        lender_name_ur VARCHAR(255),
        phone VARCHAR(50),
        direction VARCHAR(20) DEFAULT 'payable',
        principal_amount NUMERIC(14, 2) DEFAULT 0,
        fee_or_interest NUMERIC(14, 2) DEFAULT 0,
        paid_amount NUMERIC(14, 2) DEFAULT 0,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_investment_loans_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_investment_loans_biz ON investment_loans(business_id);

      CREATE TABLE IF NOT EXISTS investment_surplus (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        fund_name VARCHAR(255) NOT NULL,
        fund_name_ur VARCHAR(255),
        kaha_lagaya VARCHAR(255),
        principal_amount NUMERIC(14, 2) DEFAULT 0,
        profit_or_loss NUMERIC(14, 2) DEFAULT 0,
        roi_rate VARCHAR(50),
        is_realised BOOLEAN DEFAULT FALSE,
        maturity_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_investment_surplus_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_investment_surplus_biz ON investment_surplus(business_id);

      CREATE TABLE IF NOT EXISTS customers (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255),
        whatsapp VARCHAR(50),
        address TEXT,
        avatar VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_customers_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id);

      CREATE TABLE IF NOT EXISTS suppliers (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        contact_person VARCHAR(255),
        pan VARCHAR(100),
        brands JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_suppliers_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_suppliers_biz ON suppliers(business_id);

      CREATE TABLE IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(255),
        description TEXT,
        parent_id BIGINT DEFAULT 0,
        parent_uuid VARCHAR(64),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_categories_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_categories_biz ON categories(business_id);

      CREATE TABLE IF NOT EXISTS brands (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_brands_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_brands_biz ON brands(business_id);

      CREATE TABLE IF NOT EXISTS attributes (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        attributes JSONB,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_attributes_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_attributes_biz ON attributes(business_id);

      CREATE TABLE IF NOT EXISTS employees (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        code VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        joined_at DATE,
        department VARCHAR(100),
        position VARCHAR(100),
        document_type VARCHAR(50),
        document_number VARCHAR(100),
        avatar VARCHAR(255),
        document_files JSONB,
        status VARCHAR(50),
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_employees_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_employees_biz ON employees(business_id);

      CREATE TABLE IF NOT EXISTS currencies (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        label VARCHAR(50) NOT NULL,
        is_current BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_currencies_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_currencies_biz ON currencies(business_id);

      CREATE TABLE IF NOT EXISTS expenses (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_expenses_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_biz ON expenses(business_id, date);

      -- Tier 2: Primary Parties
      CREATE TABLE IF NOT EXISTS merchants (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        code BIGINT,
        name_en VARCHAR(255),
        name_ur VARCHAR(255),
        phone VARCHAR(50),
        city VARCHAR(255),
        customer_type VARCHAR(100),
        credit_limit NUMERIC(14, 2) DEFAULT 0,
        description VARCHAR(255),
        notes TEXT,
        opening_balance NUMERIC(14, 2) DEFAULT 0,
        current_balance NUMERIC(14, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_merchants_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_merchants_biz ON merchants(business_id);

      CREATE TABLE IF NOT EXISTS farmers (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        code BIGINT,
        name_en VARCHAR(255),
        name_ur VARCHAR(255),
        phone VARCHAR(50),
        area_id BIGINT REFERENCES areas(id) ON DELETE SET NULL,
        area_uuid VARCHAR(64),
        opening_balance NUMERIC(14, 2) DEFAULT 0,
        current_balance NUMERIC(14, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_farmers_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_farmers_biz ON farmers(business_id);

      -- Tier 3: Secondary dependencies
      CREATE TABLE IF NOT EXISTS farmer_marks (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        code BIGINT DEFAULT 0,
        farmer_id BIGINT REFERENCES farmers(id) ON DELETE CASCADE,
        farmer_uuid VARCHAR(64),
        name_en VARCHAR(255),
        name_ur VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_farmer_marks_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_farmer_marks_biz ON farmer_marks(business_id);

      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        bar_code VARCHAR(100),
        description TEXT,
        main_image VARCHAR(255),
        gallery_images JSONB,
        purchase_price NUMERIC(12, 2) DEFAULT 0,
        sale_price NUMERIC(12, 2) DEFAULT 0,
        stock_qty VARCHAR(100),
        category_ids JSONB,
        brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL,
        brand_uuid VARCHAR(64),
        supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
        supplier_uuid VARCHAR(64),
        tags JSONB,
        product_type VARCHAR(100),
        unit VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_products_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_products_biz ON products(business_id);

      -- Tier 4: Transaction headers
      CREATE TABLE IF NOT EXISTS amroza_sales (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        merchant_id BIGINT REFERENCES merchants(id) ON DELETE CASCADE,
        merchant_uuid VARCHAR(64),
        item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
        item_uuid VARCHAR(64),
        nag INTEGER DEFAULT 0,
        weight NUMERIC(10, 2) DEFAULT 0,
        rate NUMERIC(10, 2) DEFAULT 0,
        bardana NUMERIC(10, 2) DEFAULT 0,
        gross_amount NUMERIC(12, 2) DEFAULT 0,
        payment_type VARCHAR(20) DEFAULT 'udhaar',
        cash_received NUMERIC(12, 2) DEFAULT 0,
        udhaar_amount NUMERIC(12, 2) DEFAULT 0,
        consignment_id BIGINT,
        year INTEGER DEFAULT 2026,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_amroza_sales_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_amroza_sales_biz ON amroza_sales(business_id, date);

      CREATE TABLE IF NOT EXISTS merchant_receipts (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        merchant_id BIGINT REFERENCES merchants(id) ON DELETE CASCADE,
        merchant_uuid VARCHAR(64),
        amount NUMERIC(12, 2) DEFAULT 0,
        type VARCHAR(30) DEFAULT 'recovery',
        note VARCHAR(255),
        year INTEGER DEFAULT 2026,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_merchant_receipts_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_receipts_biz ON merchant_receipts(business_id, date);

      CREATE TABLE IF NOT EXISTS farmer_bills (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        farmer_id BIGINT REFERENCES farmers(id) ON DELETE CASCADE,
        farmer_uuid VARCHAR(64),
        farmer_mark_id BIGINT REFERENCES farmer_marks(id) ON DELETE SET NULL,
        farmer_mark_uuid VARCHAR(64),
        truck_no VARCHAR(100),
        item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
        item_uuid VARCHAR(64),
        nag INTEGER DEFAULT 0,
        weight NUMERIC(10, 2) DEFAULT 0,
        rate NUMERIC(10, 2) DEFAULT 0,
        commission_pct NUMERIC(5, 2) DEFAULT 6,
        bardana_per_nag NUMERIC(10, 2) DEFAULT 0,
        gross_amount NUMERIC(12, 2) DEFAULT 0,
        commission_amount NUMERIC(12, 2) DEFAULT 0,
        bardana_amount NUMERIC(12, 2) DEFAULT 0,
        kiraya NUMERIC(10, 2) DEFAULT 0,
        mazdoori NUMERIC(10, 2) DEFAULT 0,
        market_fee NUMERIC(10, 2) DEFAULT 0,
        net_amount NUMERIC(12, 2) DEFAULT 0,
        paid_amount NUMERIC(12, 2) DEFAULT 0,
        note VARCHAR(255),
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_farmer_bills_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_farmer_bills_biz ON farmer_bills(business_id, date);

      CREATE TABLE IF NOT EXISTS investment_transactions (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        ref_no VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        partner_id BIGINT REFERENCES investment_partners(id) ON DELETE SET NULL,
        partner_uuid VARCHAR(64),
        loan_id BIGINT REFERENCES investment_loans(id) ON DELETE SET NULL,
        loan_uuid VARCHAR(64),
        surplus_id BIGINT REFERENCES investment_surplus(id) ON DELETE SET NULL,
        surplus_uuid VARCHAR(64),
        party_name VARCHAR(255) NOT NULL,
        amount NUMERIC(14, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        bank_name VARCHAR(100),
        reason VARCHAR(255),
        is_advance BOOLEAN DEFAULT FALSE,
        advance_amount NUMERIC(14, 2) DEFAULT 0,
        approval_status VARCHAR(50) DEFAULT 'posted',
        approved_by VARCHAR(100),
        approved_at TIMESTAMPTZ,
        created_by_role VARCHAR(50) DEFAULT 'munshi',
        created_by_user_id VARCHAR(64),
        is_reversed BOOLEAN DEFAULT FALSE,
        reversal_reason VARCHAR(255),
        reversal_ref_no VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_investment_transactions_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_investment_transactions_biz ON investment_transactions(business_id, date);

      CREATE TABLE IF NOT EXISTS purchases (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        reference VARCHAR(100) NOT NULL,
        supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
        supplier_uuid VARCHAR(64),
        tax_percentage NUMERIC(5, 2) DEFAULT 0,
        tax_amount NUMERIC(12, 2) DEFAULT 0,
        discount_amount NUMERIC(12, 2) DEFAULT 0,
        shipping_amount NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        paid_amount NUMERIC(12, 2) DEFAULT 0,
        due_amount NUMERIC(12, 2) DEFAULT 0,
        status VARCHAR(50),
        payment_status VARCHAR(50),
        payment_method VARCHAR(50),
        type VARCHAR(50) DEFAULT 'unofficial',
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_purchases_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_purchases_biz ON purchases(business_id, date);

      CREATE TABLE IF NOT EXISTS sales (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        reference VARCHAR(100) NOT NULL,
        customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
        customer_uuid VARCHAR(64),
        tax_percentage NUMERIC(5, 2) DEFAULT 0,
        tax_amount NUMERIC(12, 2) DEFAULT 0,
        discount_amount NUMERIC(12, 2) DEFAULT 0,
        shipping_amount NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        paid_amount NUMERIC(12, 2) DEFAULT 0,
        due_amount NUMERIC(12, 2) DEFAULT 0,
        status VARCHAR(50),
        payment_status VARCHAR(50),
        payment_method VARCHAR(50),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_sales_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_sales_biz ON sales(business_id, date);

      CREATE TABLE IF NOT EXISTS purchase_returns (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        reference VARCHAR(100),
        purchase_id BIGINT REFERENCES purchases(id) ON DELETE CASCADE,
        purchase_uuid VARCHAR(64),
        purchase_detail_id BIGINT,
        purchase_detail_uuid VARCHAR(64),
        employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        employee_uuid VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_purchase_returns_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_purchase_returns_biz ON purchase_returns(business_id);

      CREATE TABLE IF NOT EXISTS sale_returns (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        reference VARCHAR(100),
        sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
        sale_uuid VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_sale_returns_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_sale_returns_biz ON sale_returns(business_id);

      -- Tier 5: Transaction details & logs
      CREATE TABLE IF NOT EXISTS purchase_details (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        purchase_id BIGINT REFERENCES purchases(id) ON DELETE CASCADE,
        purchase_uuid VARCHAR(64),
        product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
        product_uuid VARCHAR(64),
        qty INTEGER NOT NULL DEFAULT 1,
        price NUMERIC(12, 2) DEFAULT 0,
        sub_total NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_purchase_details_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_purchase_details_biz ON purchase_details(business_id);

      CREATE TABLE IF NOT EXISTS purchase_payments (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        purchase_id BIGINT REFERENCES purchases(id) ON DELETE CASCADE,
        purchase_uuid VARCHAR(64),
        date DATE NOT NULL,
        amount NUMERIC(12, 2) DEFAULT 0,
        reference VARCHAR(100),
        payment_method VARCHAR(50),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_purchase_payments_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_purchase_payments_biz ON purchase_payments(business_id);

      CREATE TABLE IF NOT EXISTS sale_details (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
        sale_uuid VARCHAR(64),
        product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
        product_uuid VARCHAR(64),
        qty INTEGER NOT NULL DEFAULT 1,
        price NUMERIC(12, 2) DEFAULT 0,
        sub_total NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_sale_details_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_sale_details_biz ON sale_details(business_id);

      CREATE TABLE IF NOT EXISTS sale_payments (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
        sale_uuid VARCHAR(64),
        date DATE NOT NULL,
        amount NUMERIC(12, 2) DEFAULT 0,
        reference VARCHAR(100),
        payment_method VARCHAR(50),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_sale_payments_biz_uuid UNIQUE (business_id, uuid)
      );
      CREATE INDEX IF NOT EXISTS idx_sale_payments_biz ON sale_payments(business_id);

      CREATE TABLE IF NOT EXISTS purchse_return_details (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        purchase_return_id BIGINT REFERENCES purchase_returns(id) ON DELETE CASCADE,
        purchase_return_uuid VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_purchse_return_details_biz_uuid UNIQUE (business_id, uuid)
      );

      CREATE TABLE IF NOT EXISTS sale_return_details (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        sale_return_id BIGINT REFERENCES sale_returns(id) ON DELETE CASCADE,
        sale_return_uuid VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_sale_return_details_biz_uuid UNIQUE (business_id, uuid)
      );

      CREATE TABLE IF NOT EXISTS investment_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        transaction_id BIGINT REFERENCES investment_transactions(id) ON DELETE SET NULL,
        transaction_uuid VARCHAR(64),
        ref_no VARCHAR(100),
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_investment_audit_logs_biz_uuid UNIQUE (business_id, uuid)
      );

      CREATE TABLE IF NOT EXISTS investment_alerts (
        id BIGSERIAL PRIMARY KEY,
        uuid VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        partner_id BIGINT REFERENCES investment_partners(id) ON DELETE SET NULL,
        partner_uuid VARCHAR(64),
        partner_name VARCHAR(255) NOT NULL,
        attempted_amount NUMERIC(14, 2) NOT NULL,
        excess_amount NUMERIC(14, 2) NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_investment_alerts_biz_uuid UNIQUE (business_id, uuid)
      );
    `);

    await client.query(`
      INSERT INTO migrations (name)
      VALUES ('006_pos_central_data_replication_tables')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 9. Migration 007: Role Simplification & Legacy Role Migration (Admin & Employee only)
    await client.query(`
      UPDATE users SET role = 'Employee' WHERE LOWER(role) IN ('manager', 'cashier', 'accountant');
      UPDATE invitations SET role = 'Employee' WHERE LOWER(role) IN ('manager', 'cashier', 'accountant');
    `);

    await client.query(`
      INSERT INTO migrations (name)
      VALUES ('007_role_simplification_and_migration')
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
