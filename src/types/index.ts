export type UserRole = 'SUPER_ADMIN' | 'CUSTOMER_ADMIN' | 'Admin' | 'Employee' | string;

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CUSTOMER_ADMIN' | 'Admin' | 'Employee' | string;
  token?: string;
  avatar?: string;
  companyId?: string;
  companyName?: string;
}

export type SubscriptionPlan = 'Starter Mandi' | 'Standard Mandi' | 'Enterprise Commission';
export type BusinessStatus = 'Active' | 'Suspended' | 'Pending Setup';
export type AccountStatus = 'Active' | 'Inactive' | 'Pending' | 'Pending Password Creation';
export type DeviceStatus = 'Active' | 'Inactive' | 'Deactivated';
export type SyncStatus = 'Synced' | 'Pending' | 'Syncing' | 'Failed';
export type InvitationStatus = 'Pending' | 'Accepted' | 'Activated' | 'Expired' | 'Cancelled';

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  mandiLocation: string;
  address: string;
  registrationDate: string;
  subscriptionPlan: SubscriptionPlan;
  status: BusinessStatus;
  devicesCount: number;
  maxDevices: number;
  monthlyFee: number;
  lastSync: string;
  inviteToken?: string;
  inviteStatus?: 'Pending' | 'Accepted' | 'Expired' | 'Cancelled';
  inviteExpiresAt?: string;
  inviteEmailSent?: boolean;
  inviteEmailError?: string;
  commissionRate?: string;
  ntn?: string;
  strn?: string;
  establishedYear?: string;
  totalCounters?: number;
  settings?: any;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessId: string;
  businessName: string;
  role: 'SUPER_ADMIN' | 'CUSTOMER_ADMIN' | 'Admin' | 'Employee' | string;
  status: AccountStatus;
  dateAdded: string;
  lastActive: string;
  createdBy?: string;
  createdByRole?: string;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  businessId: string;
  businessName: string;
  mandiLocation: string;
  counterName: string;
  activationDate: string;
  lastActive: string;
  appVersion: string;
  status: DeviceStatus;
  ipAddress: string;
  osDetails: string;
  macAddress: string;
}

export interface Subscription {
  id: string;
  businessId: string;
  businessName: string;
  plan: SubscriptionPlan;
  status: 'Active' | 'Expiring Soon' | 'Overdue' | 'Trial';
  activationDate: string;
  expiryDate: string;
  allowedDevices: number;
  registeredDevices: number;
  billingCycle: 'Monthly' | 'Annual';
  pricePKR: number;
  paymentMethod: string;
}

export interface SyncRecord {
  id: string;
  businessId: string;
  businessName: string;
  deviceId: string;
  deviceName: string;
  lastSuccessfulSync: string;
  pendingRecords: number;
  failedRecords: number;
  syncStatus: SyncStatus;
  errorMessage?: string;
  failedEntity?: string;
  retryCount: number;
}

export interface AuditLog {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  businessName: string;
  timestamp: string;
  activityDescription: string;
  category: 'Security' | 'Business' | 'Device' | 'User' | 'License' | 'Sync';
  ipAddress: string;
}

export interface Invitation {
  id: string;
  businessId: string;
  employeeName: string;
  email: string;
  assignedRole: 'Admin' | 'Employee' | string;
  invitationDate: string;
  expiryDate: string;
  status: InvitationStatus;
  token?: string;
  invitedBy?: string;
  emailSent?: boolean;
  emailError?: string;
  inviteUrl?: string;
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  allowedFeatures: string[];
  isSystemRole?: boolean;
  assignedEmployeesCount?: number;
  permissions?: {
    module: string;
    description: string;
    actions: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      export: boolean;
    };
  }[];
}

export interface CompanyProfile {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  mandiLocation: string;
  address: string;
  city: string;
  ntn: string;
  strn: string;
  commissionRate: string;
  accountStatus: 'Active' | 'Suspended';
  establishedYear: string;
  totalCounters: number;
  settings?: any;
}

export interface AppNotification {
  id: string;
  recipientId?: string;
  recipientRole?: string;
  businessId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}
