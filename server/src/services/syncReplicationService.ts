import { PoolClient } from 'pg';
import { IngestEventItem } from './syncService.js';

interface ForeignKeyMapping {
  targetTable: string;
  uuidKey: string;
  idCol: string;
  uuidCol: string;
}

interface EntityConfig {
  table: string;
  tierWeight: number;
  hasSoftDelete: boolean;
  allowedColumns: string[];
  foreignKeys?: Record<string, ForeignKeyMapping>;
}

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  // Tier 1: Independent master lookups & financial
  Area: {
    table: 'areas',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: ['name_en', 'name_ur', 'status'],
  },
  Item: {
    table: 'items',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: [
      'code', 'name_en', 'name_ur', 'unit', 'kg_per_unit', 'default_rate',
      'purchase_rate', 'discount_rate', 'default_bardana', 'shelf_life',
      'shelf_life_days', 'expiry_at', 'opening_stock', 'current_stock',
      'low_stock_alert', 'lot_date', 'stock_note', 'status'
    ],
  },
  InvestmentPartner: {
    table: 'investment_partners',
    tierWeight: 10,
    hasSoftDelete: false,
    allowedColumns: [
      'name', 'name_ur', 'role', 'phone', 'profit_percentage',
      'opening_capital', 'status', 'notes'
    ],
  },
  InvestmentLoan: {
    table: 'investment_loans',
    tierWeight: 10,
    hasSoftDelete: false,
    allowedColumns: [
      'lender_name', 'lender_name_ur', 'phone', 'direction',
      'principal_amount', 'fee_or_interest', 'paid_amount', 'due_date',
      'status', 'notes'
    ],
  },
  InvestmentSurplus: {
    table: 'investment_surplus',
    tierWeight: 10,
    hasSoftDelete: false,
    allowedColumns: [
      'fund_name', 'fund_name_ur', 'kaha_lagaya', 'principal_amount',
      'profit_or_loss', 'roi_rate', 'is_realised', 'maturity_date',
      'status', 'notes'
    ],
  },
  Customer: {
    table: 'customers',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: [
      'name', 'code', 'phone', 'email', 'whatsapp', 'address',
      'avatar', 'status', 'created_by'
    ],
  },
  Supplier: {
    table: 'suppliers',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: [
      'name', 'phone', 'address', 'contact_person', 'pan', 'brands'
    ],
  },
  Category: {
    table: 'categories',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: [
      'name', 'image', 'description', 'parent_id', 'parent_uuid', 'status'
    ],
    foreignKeys: {
      parent_id: {
        targetTable: 'categories',
        uuidKey: 'parent_uuid',
        idCol: 'parent_id',
        uuidCol: 'parent_uuid',
      },
    },
  },
  Brand: {
    table: 'brands',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: ['name', 'description', 'image'],
  },
  Attribute: {
    table: 'attributes',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: ['name', 'description', 'attributes', 'status'],
  },
  Employee: {
    table: 'employees',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: [
      'code', 'name', 'phone', 'address', 'joined_at', 'department',
      'position', 'document_type', 'document_number', 'avatar',
      'document_files', 'status', 'created_by'
    ],
  },
  Currency: {
    table: 'currencies',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: ['name', 'label', 'is_current'],
  },
  Expense: {
    table: 'expenses',
    tierWeight: 10,
    hasSoftDelete: true,
    allowedColumns: ['date', 'title', 'amount', 'description'],
  },

  // Tier 2: Primary Parties
  Merchant: {
    table: 'merchants',
    tierWeight: 20,
    hasSoftDelete: true,
    allowedColumns: [
      'code', 'name_en', 'name_ur', 'phone', 'city', 'customer_type',
      'credit_limit', 'description', 'notes', 'opening_balance',
      'current_balance', 'status', 'created_by'
    ],
  },
  Farmer: {
    table: 'farmers',
    tierWeight: 20,
    hasSoftDelete: true,
    allowedColumns: [
      'code', 'name_en', 'name_ur', 'phone', 'area_id', 'area_uuid',
      'opening_balance', 'current_balance', 'status', 'created_by'
    ],
    foreignKeys: {
      area_id: {
        targetTable: 'areas',
        uuidKey: 'area_uuid',
        idCol: 'area_id',
        uuidCol: 'area_uuid',
      },
    },
  },

  // Tier 3: Secondary dependencies
  FarmerMark: {
    table: 'farmer_marks',
    tierWeight: 30,
    hasSoftDelete: true,
    allowedColumns: ['code', 'farmer_id', 'farmer_uuid', 'name_en', 'name_ur'],
    foreignKeys: {
      farmer_id: {
        targetTable: 'farmers',
        uuidKey: 'farmer_uuid',
        idCol: 'farmer_id',
        uuidCol: 'farmer_uuid',
      },
    },
  },
  Product: {
    table: 'products',
    tierWeight: 30,
    hasSoftDelete: true,
    allowedColumns: [
      'title', 'sku', 'bar_code', 'description', 'main_image',
      'gallery_images', 'purchase_price', 'sale_price', 'stock_qty',
      'category_ids', 'brand_id', 'brand_uuid', 'supplier_id',
      'supplier_uuid', 'tags', 'product_type', 'unit', 'status'
    ],
    foreignKeys: {
      brand_id: {
        targetTable: 'brands',
        uuidKey: 'brand_uuid',
        idCol: 'brand_id',
        uuidCol: 'brand_uuid',
      },
      supplier_id: {
        targetTable: 'suppliers',
        uuidKey: 'supplier_uuid',
        idCol: 'supplier_id',
        uuidCol: 'supplier_uuid',
      },
    },
  },

  // Tier 4: Transaction headers
  AmrozaSale: {
    table: 'amroza_sales',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: [
      'date', 'merchant_id', 'merchant_uuid', 'item_id', 'item_uuid',
      'nag', 'weight', 'rate', 'bardana', 'gross_amount', 'payment_type',
      'cash_received', 'udhaar_amount', 'consignment_id', 'year', 'created_by'
    ],
    foreignKeys: {
      merchant_id: {
        targetTable: 'merchants',
        uuidKey: 'merchant_uuid',
        idCol: 'merchant_id',
        uuidCol: 'merchant_uuid',
      },
      item_id: {
        targetTable: 'items',
        uuidKey: 'item_uuid',
        idCol: 'item_id',
        uuidCol: 'item_uuid',
      },
    },
  },
  MerchantReceipt: {
    table: 'merchant_receipts',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: [
      'date', 'merchant_id', 'merchant_uuid', 'amount', 'type',
      'note', 'year', 'created_by'
    ],
    foreignKeys: {
      merchant_id: {
        targetTable: 'merchants',
        uuidKey: 'merchant_uuid',
        idCol: 'merchant_id',
        uuidCol: 'merchant_uuid',
      },
    },
  },
  FarmerBill: {
    table: 'farmer_bills',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: [
      'date', 'farmer_id', 'farmer_uuid', 'farmer_mark_id', 'farmer_mark_uuid',
      'truck_no', 'item_id', 'item_uuid', 'nag', 'weight', 'rate',
      'commission_pct', 'bardana_per_nag', 'gross_amount', 'commission_amount',
      'bardana_amount', 'kiraya', 'mazdoori', 'market_fee', 'net_amount',
      'paid_amount', 'note', 'created_by'
    ],
    foreignKeys: {
      farmer_id: {
        targetTable: 'farmers',
        uuidKey: 'farmer_uuid',
        idCol: 'farmer_id',
        uuidCol: 'farmer_uuid',
      },
      farmer_mark_id: {
        targetTable: 'farmer_marks',
        uuidKey: 'farmer_mark_uuid',
        idCol: 'farmer_mark_id',
        uuidCol: 'farmer_mark_uuid',
      },
      item_id: {
        targetTable: 'items',
        uuidKey: 'item_uuid',
        idCol: 'item_id',
        uuidCol: 'item_uuid',
      },
    },
  },
  InvestmentTransaction: {
    table: 'investment_transactions',
    tierWeight: 40,
    hasSoftDelete: false,
    allowedColumns: [
      'ref_no', 'date', 'type', 'partner_id', 'partner_uuid', 'loan_id',
      'loan_uuid', 'surplus_id', 'surplus_uuid', 'party_name', 'amount',
      'payment_method', 'bank_name', 'reason', 'is_advance', 'advance_amount',
      'approval_status', 'approved_by', 'approved_at', 'created_by_role',
      'created_by_user_id', 'is_reversed', 'reversal_reason', 'reversal_ref_no'
    ],
    foreignKeys: {
      partner_id: {
        targetTable: 'investment_partners',
        uuidKey: 'partner_uuid',
        idCol: 'partner_id',
        uuidCol: 'partner_uuid',
      },
      loan_id: {
        targetTable: 'investment_loans',
        uuidKey: 'loan_uuid',
        idCol: 'loan_id',
        uuidCol: 'loan_uuid',
      },
      surplus_id: {
        targetTable: 'investment_surplus',
        uuidKey: 'surplus_uuid',
        idCol: 'surplus_id',
        uuidCol: 'surplus_uuid',
      },
    },
  },
  Purchase: {
    table: 'purchases',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: [
      'date', 'reference', 'supplier_id', 'supplier_uuid', 'tax_percentage',
      'tax_amount', 'discount_amount', 'shipping_amount', 'total_amount',
      'paid_amount', 'due_amount', 'status', 'payment_status', 'payment_method',
      'type', 'note'
    ],
    foreignKeys: {
      supplier_id: {
        targetTable: 'suppliers',
        uuidKey: 'supplier_uuid',
        idCol: 'supplier_id',
        uuidCol: 'supplier_uuid',
      },
    },
  },
  Sale: {
    table: 'sales',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: [
      'date', 'reference', 'customer_id', 'customer_uuid', 'tax_percentage',
      'tax_amount', 'discount_amount', 'shipping_amount', 'total_amount',
      'paid_amount', 'due_amount', 'status', 'payment_status', 'payment_method',
      'note'
    ],
    foreignKeys: {
      customer_id: {
        targetTable: 'customers',
        uuidKey: 'customer_uuid',
        idCol: 'customer_id',
        uuidCol: 'customer_uuid',
      },
    },
  },
  PurchaseReturn: {
    table: 'purchase_returns',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: [
      'reference', 'purchase_id', 'purchase_uuid', 'purchase_detail_id',
      'purchase_detail_uuid', 'employee_id', 'employee_uuid'
    ],
    foreignKeys: {
      purchase_id: {
        targetTable: 'purchases',
        uuidKey: 'purchase_uuid',
        idCol: 'purchase_id',
        uuidCol: 'purchase_uuid',
      },
      employee_id: {
        targetTable: 'employees',
        uuidKey: 'employee_uuid',
        idCol: 'employee_id',
        uuidCol: 'employee_uuid',
      },
    },
  },
  SaleReturn: {
    table: 'sale_returns',
    tierWeight: 40,
    hasSoftDelete: true,
    allowedColumns: ['reference', 'sale_id', 'sale_uuid'],
    foreignKeys: {
      sale_id: {
        targetTable: 'sales',
        uuidKey: 'sale_uuid',
        idCol: 'sale_id',
        uuidCol: 'sale_uuid',
      },
    },
  },

  // Tier 5: Transaction details & logs
  PurchaseDetail: {
    table: 'purchase_details',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: [
      'purchase_id', 'purchase_uuid', 'product_id', 'product_uuid',
      'qty', 'price', 'sub_total'
    ],
    foreignKeys: {
      purchase_id: {
        targetTable: 'purchases',
        uuidKey: 'purchase_uuid',
        idCol: 'purchase_id',
        uuidCol: 'purchase_uuid',
      },
      product_id: {
        targetTable: 'products',
        uuidKey: 'product_uuid',
        idCol: 'product_id',
        uuidCol: 'product_uuid',
      },
    },
  },
  PurchasePayment: {
    table: 'purchase_payments',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: [
      'purchase_id', 'purchase_uuid', 'date', 'amount', 'reference',
      'payment_method', 'note'
    ],
    foreignKeys: {
      purchase_id: {
        targetTable: 'purchases',
        uuidKey: 'purchase_uuid',
        idCol: 'purchase_id',
        uuidCol: 'purchase_uuid',
      },
    },
  },
  SaleDetail: {
    table: 'sale_details',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: [
      'sale_id', 'sale_uuid', 'product_id', 'product_uuid',
      'qty', 'price', 'sub_total'
    ],
    foreignKeys: {
      sale_id: {
        targetTable: 'sales',
        uuidKey: 'sale_uuid',
        idCol: 'sale_id',
        uuidCol: 'sale_uuid',
      },
      product_id: {
        targetTable: 'products',
        uuidKey: 'product_uuid',
        idCol: 'product_id',
        uuidCol: 'product_uuid',
      },
    },
  },
  SalePayment: {
    table: 'sale_payments',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: [
      'sale_id', 'sale_uuid', 'date', 'amount', 'reference',
      'payment_method', 'note'
    ],
    foreignKeys: {
      sale_id: {
        targetTable: 'sales',
        uuidKey: 'sale_uuid',
        idCol: 'sale_id',
        uuidCol: 'sale_uuid',
      },
    },
  },
  PurchseReturnDetail: {
    table: 'purchse_return_details',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: ['purchase_return_id', 'purchase_return_uuid'],
    foreignKeys: {
      purchase_return_id: {
        targetTable: 'purchase_returns',
        uuidKey: 'purchase_return_uuid',
        idCol: 'purchase_return_id',
        uuidCol: 'purchase_return_uuid',
      },
    },
  },
  SaleReturnDetail: {
    table: 'sale_return_details',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: ['sale_return_id', 'sale_return_uuid'],
    foreignKeys: {
      sale_return_id: {
        targetTable: 'sale_returns',
        uuidKey: 'sale_return_uuid',
        idCol: 'sale_return_id',
        uuidCol: 'sale_return_uuid',
      },
    },
  },
  InvestmentAuditLog: {
    table: 'investment_audit_logs',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: [
      'action', 'transaction_id', 'transaction_uuid', 'ref_no',
      'user_name', 'user_role', 'details'
    ],
    foreignKeys: {
      transaction_id: {
        targetTable: 'investment_transactions',
        uuidKey: 'transaction_uuid',
        idCol: 'transaction_id',
        uuidCol: 'transaction_uuid',
      },
    },
  },
  InvestmentAlert: {
    table: 'investment_alerts',
    tierWeight: 50,
    hasSoftDelete: false,
    allowedColumns: [
      'partner_id', 'partner_uuid', 'partner_name', 'attempted_amount',
      'excess_amount', 'resolved', 'notes'
    ],
    foreignKeys: {
      partner_id: {
        targetTable: 'investment_partners',
        uuidKey: 'partner_uuid',
        idCol: 'partner_id',
        uuidCol: 'partner_uuid',
      },
    },
  },
};

/**
 * Normalizes entity attributes from payload, supporting both structured outbox
 * payloads ({ attributes, relationships }) and flat objects.
 */
function normalizeAttributes(entityType: string, rawPayload: Record<string, any>): {
  attributes: Record<string, any>;
  relationships: Record<string, string>;
} {
  let attributes: Record<string, any> = {};
  let relationships: Record<string, string> = {};

  if (rawPayload && typeof rawPayload === 'object') {
    if (rawPayload.attributes && typeof rawPayload.attributes === 'object') {
      attributes = { ...rawPayload.attributes };
      relationships = { ...(rawPayload.relationships || {}) };
    } else {
      attributes = { ...rawPayload };
    }
  }

  // Strip client SQLite local auto-increment numeric ID
  delete attributes.id;

  // Attribute aliases for Mandi domain consistency
  if (attributes.name && !attributes.name_en) {
    attributes.name_en = attributes.name;
  }
  if (entityType === 'Item') {
    if (attributes.rate !== undefined && attributes.default_rate === undefined) {
      attributes.default_rate = attributes.rate;
    }
    if (attributes.bardana !== undefined && attributes.default_bardana === undefined) {
      attributes.default_bardana = attributes.bardana;
    }
  }

  return { attributes, relationships };
}

/**
 * Resolves parent relationship foreign keys to central database integer primary keys.
 */
async function resolveRelationships(
  client: PoolClient,
  businessId: string,
  config: EntityConfig,
  attributes: Record<string, any>,
  relationships: Record<string, string>
): Promise<Record<string, any>> {
  if (!config.foreignKeys) return attributes;

  for (const [_, fk] of Object.entries(config.foreignKeys)) {
    const parentUuid = relationships[fk.uuidKey] || attributes[fk.uuidCol];

    if (parentUuid && typeof parentUuid === 'string' && parentUuid.trim()) {
      attributes[fk.uuidCol] = parentUuid.trim().toLowerCase();

      // Look up parent's central integer id in the target table strictly scoped to this business
      const parentRes = await client.query(
        `SELECT id FROM ${fk.targetTable} WHERE business_id = $1 AND uuid = $2 LIMIT 1;`,
        [businessId, attributes[fk.uuidCol]]
      );

      if (parentRes.rows.length > 0) {
        attributes[fk.idCol] = parentRes.rows[0].id;
      } else {
        // Parent not yet created in central database (or created later)
        // Set idCol to null while preserving uuidCol so dependency remains resolvable
        attributes[fk.idCol] = null;
      }
    }
  }

  return attributes;
}

/**
 * Sorts an incoming batch of events by dependency tier weight.
 * Creates and updates run Tier 1 -> Tier 5.
 * Deletions run in reverse tier (Tier 5 -> Tier 1) to respect referential integrity.
 */
export function sortEventsByDependency(events: IngestEventItem[]): IngestEventItem[] {
  return [...events].sort((a, b) => {
    const opA = (a.operation || '').toLowerCase();
    const opB = (b.operation || '').toLowerCase();
    const configA = ENTITY_CONFIGS[a.entity_type];
    const configB = ENTITY_CONFIGS[b.entity_type];

    const weightA = configA ? configA.tierWeight : 99;
    const weightB = configB ? configB.tierWeight : 99;

    // Put deletes after creates/updates
    if (opA === 'delete' && opB !== 'delete') return 1;
    if (opA !== 'delete' && opB === 'delete') return -1;

    // Both deletes: reverse order (children deleted before parents)
    if (opA === 'delete' && opB === 'delete') {
      return weightB - weightA;
    }

    return weightA - weightB;
  });
}

/**
 * Materializes / replicates a single sync event into the central PostgreSQL business table.
 */
export async function replicateSingleEvent(
  client: PoolClient,
  businessId: string,
  event: IngestEventItem
): Promise<{ success: boolean; action: string; error?: string }> {
  const entityType = event.entity_type;
  const entityUuid = (event.entity_uuid || '').trim().toLowerCase();
  const operation = (event.operation || '').trim().toLowerCase();

  const config = ENTITY_CONFIGS[entityType];
  if (!config) {
    // If an unknown entity type is passed, skip materialization without crashing
    return { success: true, action: 'skipped_unsupported_entity' };
  }

  const tableName = config.table;

  // Handle Deletion
  if (operation === 'delete') {
    if (config.hasSoftDelete) {
      await client.query(
        `UPDATE ${tableName} SET deleted_at = NOW(), updated_at = NOW() WHERE business_id = $1 AND uuid = $2;`,
        [businessId, entityUuid]
      );
    } else {
      await client.query(
        `DELETE FROM ${tableName} WHERE business_id = $1 AND uuid = $2;`,
        [businessId, entityUuid]
      );
    }
    return { success: true, action: 'deleted' };
  }

  // Handle Create or Update
  const { attributes: rawAttrs, relationships } = normalizeAttributes(entityType, event.payload);
  const attributes = await resolveRelationships(client, businessId, config, rawAttrs, relationships);

  // Filter allowed columns
  const allowedSet = new Set(config.allowedColumns);
  if (config.foreignKeys) {
    for (const fk of Object.values(config.foreignKeys)) {
      allowedSet.add(fk.idCol);
      allowedSet.add(fk.uuidCol);
    }
  }

  // Check if record already exists by (business_id, uuid)
  const existingRes = await client.query(
    `SELECT id FROM ${tableName} WHERE business_id = $1 AND uuid = $2 LIMIT 1;`,
    [businessId, entityUuid]
  );

  const isExisting = existingRes.rows.length > 0;

  if (isExisting) {
    // Dynamic UPDATE
    const updateCols: string[] = [];
    const updateVals: any[] = [businessId, entityUuid];
    let paramIndex = 3;

    for (const [key, val] of Object.entries(attributes)) {
      if (allowedSet.has(key)) {
        updateCols.push(`"${key}" = $${paramIndex}`);
        updateVals.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
        paramIndex++;
      }
    }

    if (config.hasSoftDelete) {
      updateCols.push(`deleted_at = NULL`);
    }
    updateCols.push(`updated_at = NOW()`);

    if (updateCols.length > 0) {
      const updateQuery = `
        UPDATE ${tableName}
        SET ${updateCols.join(', ')}
        WHERE business_id = $1 AND uuid = $2;
      `;
      await client.query(updateQuery, updateVals);
    }

    return { success: true, action: 'updated' };
  } else {
    // Dynamic INSERT
    const insertCols: string[] = ['business_id', 'uuid'];
    const insertVals: any[] = [businessId, entityUuid];
    const placeholders: string[] = ['$1', '$2'];
    let paramIndex = 3;

    for (const [key, val] of Object.entries(attributes)) {
      if (allowedSet.has(key)) {
        insertCols.push(`"${key}"`);
        placeholders.push(`$${paramIndex}`);
        insertVals.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
        paramIndex++;
      }
    }

    const insertQuery = `
      INSERT INTO ${tableName} (${insertCols.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (business_id, uuid) DO UPDATE SET
        updated_at = NOW();
    `;

    await client.query(insertQuery, insertVals);
    return { success: true, action: 'created' };
  }
}

/**
 * Replicates an entire batch of sync events into central PostgreSQL business tables.
 * Guaranteed to execute within the caller's database transaction.
 */
export async function replicateSyncBatch(
  client: PoolClient,
  businessId: string,
  events: IngestEventItem[]
): Promise<{ processed: number; failed: number; errors: Array<{ event_uuid: string; error: string }> }> {
  const ordered = sortEventsByDependency(events);
  let processedCount = 0;
  let failedCount = 0;
  const errors: Array<{ event_uuid: string; error: string }> = [];

  for (const event of ordered) {
    try {
      const result = await replicateSingleEvent(client, businessId, event);
      if (result.success) {
        processedCount++;
        // Update sync_events status to processed
        await client.query(
          `UPDATE sync_events SET status = 'processed', processed_at = NOW(), error_message = NULL WHERE event_uuid = $1;`,
          [event.event_uuid.toLowerCase()]
        );
      } else {
        failedCount++;
        errors.push({
          event_uuid: event.event_uuid,
          error: result.error || 'Replication failed',
        });
        await client.query(
          `UPDATE sync_events SET status = 'failed', error_message = $1 WHERE event_uuid = $2;`,
          [result.error || 'Replication failed', event.event_uuid.toLowerCase()]
        );
      }
    } catch (err: any) {
      failedCount++;
      errors.push({
        event_uuid: event.event_uuid,
        error: err.message || 'Replication exception',
      });
      await client.query(
        `UPDATE sync_events SET status = 'failed', error_message = $1 WHERE event_uuid = $2;`,
        [err.message || 'Replication exception', event.event_uuid.toLowerCase()]
      );
    }
  }

  return {
    processed: processedCount,
    failed: failedCount,
    errors,
  };
}
