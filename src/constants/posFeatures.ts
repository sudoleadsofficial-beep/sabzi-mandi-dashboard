import { RolePermission } from '../types';

export interface POSFeature {
  id: string;
  name: string;
  description: string;
  category?: 'Sales & Operations' | 'Khata & Finance' | 'Master Records' | 'System';
}

/**
 * Centrally defined POS features for Sabzi Mandi.
 * To add a new POS feature in the future, simply add it to this array.
 * The Roles & Permissions page and database persistence will adapt automatically.
 */
export const POS_FEATURES: POSFeature[] = [
  {
    id: 'new_sale',
    name: 'New Sale',
    description: 'Create and process customer sales and auction billing slips',
    category: 'Sales & Operations',
  },
  {
    id: 'wasooli',
    name: 'Wasooli',
    description: 'Record customer payment recovery and cash receipts',
    category: 'Sales & Operations',
  },
  {
    id: 'stock_management',
    name: 'Stock Management',
    description: 'Track incoming crates, inventory balance, and stock levels',
    category: 'Sales & Operations',
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'View and manage customer / buyer contact and credit profiles',
    category: 'Master Records',
  },
  {
    id: 'farmers',
    name: 'Farmers',
    description: 'View and manage farmer / grower profiles and arrival lots',
    category: 'Master Records',
  },
  {
    id: 'bank_accounts',
    name: 'Bank Accounts',
    description: 'View Mandi business bank accounts and check balances',
    category: 'Khata & Finance',
  },
  {
    id: 'deposit_transfer',
    name: 'Deposit / Transfer',
    description: 'Record bank cash deposits and account transfers',
    category: 'Khata & Finance',
  },
  {
    id: 'cheques',
    name: 'Cheques',
    description: 'Record incoming and outgoing cheque transactions and clearing',
    category: 'Khata & Finance',
  },
  {
    id: 'investment_capital',
    name: 'Investment / Capital',
    description: 'Track owner capital, investments, and business equity entries',
    category: 'Khata & Finance',
  },
  {
    id: 'merchant_khata',
    name: 'Merchant Khata',
    description: 'Buyer credit ledger, commission balances, and account statements',
    category: 'Khata & Finance',
  },
  {
    id: 'farmer_khata',
    name: 'Farmer Khata',
    description: 'Farmer / Zamindar ledger, advance payments, and net payout calculation',
    category: 'Khata & Finance',
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'View daily rokar (cash book), sales summary, and financial reports',
    category: 'Sales & Operations',
  },
  {
    id: 'expiry_gifts',
    name: 'Expiry & Gifts',
    description: 'Record perishable vegetable wastage, spoilage, and complimentary gifts',
    category: 'Sales & Operations',
  },
  {
    id: 'discount_rules',
    name: 'Discount Rules',
    description: 'Set commission discount percentages and custom pricing rules',
    category: 'Sales & Operations',
  },
  {
    id: 'backup_restore',
    name: 'Backup & Restore',
    description: 'Create database backup files and perform system restore',
    category: 'System',
  },
];

/**
 * All feature IDs
 */
export const ALL_FEATURE_IDS: string[] = POS_FEATURES.map((f) => f.id);

/**
 * Standard default features enabled for Employee
 */
export const DEFAULT_EMPLOYEE_FEATURES: string[] = [
  'new_sale',
  'wasooli',
  'stock_management',
  'customers',
  'farmers',
  'merchant_khata',
  'farmer_khata',
];

/**
 * Default 2 roles: Admin (full access) and Employee (customizable)
 */
export const DEFAULT_ROLES_PERMISSIONS: RolePermission[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Full access to all POS features. Admin access is permanent and cannot be restricted.',
    isSystemRole: true,
    allowedFeatures: ALL_FEATURE_IDS,
  },
  {
    id: 'role-employee',
    name: 'Employee',
    description: 'Access only to the features enabled by the Admin.',
    isSystemRole: false,
    allowedFeatures: DEFAULT_EMPLOYEE_FEATURES,
  },
];

/**
 * Normalizes roles loaded from database or state:
 * 1. Ensures ONLY Admin and Employee exist (removes legacy Manager/Cashier).
 * 2. Ensures Admin always has ALL features enabled (cannot remove own access).
 * 3. Ensures Employee has valid feature IDs matching POS_FEATURES.
 */
export function normalizeRolesPermissions(rawRoles?: any[] | null): RolePermission[] {
  if (!rawRoles || !Array.isArray(rawRoles) || rawRoles.length === 0) {
    return DEFAULT_ROLES_PERMISSIONS;
  }

  // Find Admin config if present
  const adminEntry = rawRoles.find(
    (r) => (r.name && r.name.toLowerCase() === 'admin') || r.id === 'role-admin'
  );

  // Find Employee config (or fallback from legacy roles)
  const employeeEntry = rawRoles.find(
    (r) =>
      (r.name && r.name.toLowerCase() === 'employee') ||
      r.id === 'role-employee' ||
      (r.name && (r.name.toLowerCase() === 'manager' || r.name.toLowerCase() === 'cashier'))
  );

  let employeeAllowed: string[] = DEFAULT_EMPLOYEE_FEATURES;
  if (employeeEntry && Array.isArray(employeeEntry.allowedFeatures)) {
    // Filter only valid known features
    employeeAllowed = employeeEntry.allowedFeatures.filter((id: string) =>
      ALL_FEATURE_IDS.includes(id)
    );
  } else if (employeeEntry && Array.isArray(employeeEntry.permissions)) {
    // If migrating from legacy permission objects, map modules to features
    employeeAllowed = DEFAULT_EMPLOYEE_FEATURES;
  }

  return [
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Full access to all POS features. Admin access is permanent and cannot be restricted.',
      isSystemRole: true,
      allowedFeatures: ALL_FEATURE_IDS, // Admin ALWAYS has all features
    },
    {
      id: 'role-employee',
      name: 'Employee',
      description: 'Access only to the features enabled by the Admin.',
      isSystemRole: false,
      allowedFeatures: employeeAllowed,
    },
  ];
}
