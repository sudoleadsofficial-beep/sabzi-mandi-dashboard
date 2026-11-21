import { RolePermission } from '../types';

export const initialRolesPermissions: RolePermission[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Complete operational and management access to all Mandi transactions, master accounts, staff and hardware.',
    assignedEmployeesCount: 0,
    permissions: [
      {
        module: 'Point of Sale & Boli Entry',
        description: 'Conduct vegetable auctions, weight recording, buyer bidding and instant slips',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
      {
        module: 'Farmer & Grower Ledger (Zamindar Khata)',
        description: 'Manage farmer arrival lots, advances, crates balance and final net payment calculations',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
      {
        module: 'Buyer Khata & Invoicing (Khareedar)',
        description: 'Manage credit buyers, daily commission calculation, market fee, and payment receipts',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
      {
        module: 'Cash Drawer & Daily Closing (Rokar / Roznamcha)',
        description: 'Morning opening cash, day-end cash reconciliation, safe deposit, and day lock',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
      {
        module: 'Mandi Daily Rate Sheet (Nirkh Nama)',
        description: 'Input official and prevailing market wholesale rates per 40kg (Maund) and crate',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
      {
        module: 'Hardware & POS Terminal Sync',
        description: 'Manage thermal printers, digital weighing scale integration, and cloud sync trigger',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
      {
        module: 'Financial & Audit Reports',
        description: 'View profit/loss, Aarthi commission breakdown, unrecovered buyer balances',
        actions: { view: true, create: true, edit: true, delete: true, export: true },
      },
    ],
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Supervises daily Mandi floor operations, authorizes rate adjustments, and oversees lot dispatch.',
    assignedEmployeesCount: 0,
    permissions: [
      {
        module: 'Point of Sale & Boli Entry',
        description: 'Conduct vegetable auctions, weight recording, buyer bidding and instant slips',
        actions: { view: true, create: true, edit: true, delete: false, export: true },
      },
      {
        module: 'Farmer & Grower Ledger (Zamindar Khata)',
        description: 'Manage farmer arrival lots, advances, crates balance and final net payment calculations',
        actions: { view: true, create: true, edit: true, delete: false, export: true },
      },
      {
        module: 'Buyer Khata & Invoicing (Khareedar)',
        description: 'Manage credit buyers, daily commission calculation, market fee, and payment receipts',
        actions: { view: true, create: true, edit: true, delete: false, export: true },
      },
      {
        module: 'Cash Drawer & Daily Closing (Rokar / Roznamcha)',
        description: 'Morning opening cash, day-end cash reconciliation, safe deposit, and day lock',
        actions: { view: true, create: true, edit: false, delete: false, export: true },
      },
      {
        module: 'Mandi Daily Rate Sheet (Nirkh Nama)',
        description: 'Input official and prevailing market wholesale rates per 40kg (Maund) and crate',
        actions: { view: true, create: true, edit: true, delete: false, export: false },
      },
      {
        module: 'Hardware & POS Terminal Sync',
        description: 'Manage thermal printers, digital weighing scale integration, and cloud sync trigger',
        actions: { view: true, create: false, edit: false, delete: false, export: false },
      },
      {
        module: 'Financial & Audit Reports',
        description: 'View profit/loss, Aarthi commission breakdown, unrecovered buyer balances',
        actions: { view: true, create: false, edit: false, delete: false, export: true },
      },
    ],
  },
  {
    id: 'role-cashier',
    name: 'Cashier',
    description: 'Fast-paced billing counter cashier for entering lots, printing katchi/pakki parchis, and collecting cash.',
    assignedEmployeesCount: 0,
    permissions: [
      {
        module: 'Point of Sale & Boli Entry',
        description: 'Conduct vegetable auctions, weight recording, buyer bidding and instant slips',
        actions: { view: true, create: true, edit: false, delete: false, export: false },
      },
      {
        module: 'Farmer & Grower Ledger (Zamindar Khata)',
        description: 'Manage farmer arrival lots, advances, crates balance and final net payment calculations',
        actions: { view: true, create: false, edit: false, delete: false, export: false },
      },
      {
        module: 'Buyer Khata & Invoicing (Khareedar)',
        description: 'Manage credit buyers, daily commission calculation, market fee, and payment receipts',
        actions: { view: true, create: true, edit: false, delete: false, export: false },
      },
      {
        module: 'Cash Drawer & Daily Closing (Rokar / Roznamcha)',
        description: 'Morning opening cash, day-end cash reconciliation, safe deposit, and day lock',
        actions: { view: true, create: true, edit: false, delete: false, export: false },
      },
      {
        module: 'Mandi Daily Rate Sheet (Nirkh Nama)',
        description: 'Input official and prevailing market wholesale rates per 40kg (Maund) and crate',
        actions: { view: true, create: false, edit: false, delete: false, export: false },
      },
      {
        module: 'Hardware & POS Terminal Sync',
        description: 'Manage thermal printers, digital weighing scale integration, and cloud sync trigger',
        actions: { view: false, create: false, edit: false, delete: false, export: false },
      },
      {
        module: 'Financial & Audit Reports',
        description: 'View profit/loss, Aarthi commission breakdown, unrecovered buyer balances',
        actions: { view: false, create: false, edit: false, delete: false, export: false },
      },
    ],
  },
];
