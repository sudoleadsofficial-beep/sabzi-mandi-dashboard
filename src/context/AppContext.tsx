import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  CurrentUser, 
  Business, 
  AppUser, 
  Device, 
  Subscription, 
  SyncRecord, 
  AuditLog, 
  Invitation, 
  RolePermission, 
  CompanyProfile,
  AppNotification 
} from '../types';
import { initialRolesPermissions } from '../data/mockData';
import { normalizeRolesPermissions, ALL_FEATURE_IDS } from '../constants/posFeatures';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface BusinessCreationResult {
  success: boolean;
  message: string;
  business?: Business;
  invitation?: {
    id: string;
    token: string;
    status: string;
    expiresAt: string;
    inviteUrl: string;
  };
  emailStatus?: {
    sent: boolean;
    requiresSetup: boolean;
    message: string;
  };
  inviteUrl?: string;
}

export interface InvitationSendResult {
  success: boolean;
  message: string;
  invitation?: {
    id: string;
    token: string;
    status: string;
    expiresAt: string;
    inviteUrl: string;
  };
  emailStatus?: {
    sent: boolean;
    requiresSetup: boolean;
    message: string;
  };
  inviteUrl?: string;
}

const emptyCompanyProfile: CompanyProfile = {
  id: '',
  name: '',
  ownerName: '',
  email: '',
  phone: '',
  mandiLocation: '',
  address: '',
  city: '',
  ntn: '',
  strn: '',
  commissionRate: '',
  accountStatus: 'Active',
  establishedYear: '',
  totalCounters: 0,
};

interface AppContextType {
  currentUser: CurrentUser | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  loginAs: (role: string, email?: string, rememberMe?: boolean, userData?: Partial<CurrentUser>, token?: string) => void;
  logout: () => void;
  
  // Real Database Data
  businesses: Business[];
  users: AppUser[];
  devices: Device[];
  subscriptions: Subscription[];
  syncRecords: SyncRecord[];
  auditLogs: AuditLog[];
  invitations: Invitation[];
  rolesPermissions: RolePermission[];
  companyProfile: CompanyProfile;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  
  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Actions
  refreshBusinesses: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshSyncRecords: () => Promise<void>;
  
  addBusiness: (business: Omit<Business, 'id' | 'devicesCount' | 'lastSync'> & { initialAdminName?: string; initialAdminEmail?: string; sendInvitation?: boolean }) => Promise<BusinessCreationResult>;
  updateBusiness: (id: string, updates: Partial<Business>) => Promise<void>;
  deleteBusiness: (id: string) => Promise<boolean>;
  toggleBusinessStatus: (id: string) => void;
  sendBusinessInvitation: (businessId: string, email?: string, name?: string) => Promise<InvitationSendResult>;

  addUser: (user: Omit<AppUser, 'id' | 'dateAdded' | 'lastActive'>) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<boolean>;
  toggleUserStatus: (id: string) => Promise<void>;

  toggleDeviceStatus: (id: string) => void;
  registerDevice: (device: Omit<Device, 'id' | 'activationDate' | 'lastActive' | 'status'>) => void;

  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  triggerSyncRetry: (id: string) => void;

  sendInvitation: (employeeName: string, email: string, assignedRole: 'Admin' | 'Employee' | string) => Promise<InvitationSendResult>;
  cancelInvitation: (id: string) => Promise<void>;
  resendInvitation: (id: string) => Promise<InvitationSendResult>;

  updateRolePermissions: (roleId: string, allowedFeatures: string[]) => Promise<boolean>;
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => Promise<void>;
  updateBusinessSettings: (settings: any) => Promise<boolean>;

  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;

  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (name: string, phone: string) => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'vegetable_pos_jwt_token';
const AUTH_USER_KEY = 'vegetable_pos_auth_user';

const getInitialUser = (): CurrentUser | null => {
  try {
    const saved =
      sessionStorage.getItem(AUTH_USER_KEY) ||
      localStorage.getItem(AUTH_USER_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);
      const token =
        parsed.token ||
        sessionStorage.getItem(AUTH_TOKEN_KEY) ||
        localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        parsed.token = token;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse saved session', e);
  }
  return null;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(getInitialUser);
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Core Data States - All start empty and are populated strictly from PostgreSQL
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rolesPermissions, setRolesPermissions] = useState<RolePermission[]>(initialRolesPermissions);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(emptyCompanyProfile);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getAuthHeaders = useCallback(() => {
    const token =
      currentUser?.token ||
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(AUTH_TOKEN_KEY);

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-role': currentUser?.role || '',
      'x-user-business-id': currentUser?.companyId || '',
      'x-user-id': currentUser?.id || '',
    };
  }, [currentUser]);

  // Session verification on mount
  useEffect(() => {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            const u: CurrentUser = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              companyId: data.user.businessId,
              companyName: data.user.businessName,
              token: data.token || token,
            };
            setCurrentUser(u);
          } else {
            sessionStorage.removeItem(AUTH_USER_KEY);
            sessionStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setCurrentUser(null);
          }
        })
        .catch((err) => {
          console.warn('Could not verify session with server:', err);
        });
    }
  }, []);

  // 1. Fetch Real Businesses from PostgreSQL
  const refreshBusinesses = useCallback(async () => {
    try {
      const url = currentUser?.role === 'CUSTOMER_ADMIN' && currentUser?.companyId
        ? `/api/businesses?businessId=${encodeURIComponent(currentUser.companyId)}`
        : '/api/businesses';

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.businesses && Array.isArray(data.businesses)) {
          const mapped: Business[] = data.businesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            ownerName: b.ownerName,
            email: b.email,
            phone: b.phone || '',
            city: b.city || '',
            mandiLocation: b.mandiLocation || '',
            address: b.address || '',
            registrationDate: b.registrationDate || '',
            subscriptionPlan: 'Standard Mandi',
            status: b.status || 'Active',
            devicesCount: b.totalCounters || 0,
            maxDevices: 5,
            monthlyFee: 0,
            lastSync: '',
            inviteToken: b.inviteToken || undefined,
            inviteStatus: b.inviteStatus || undefined,
            inviteExpiresAt: b.inviteExpiresAt || undefined,
            inviteEmailSent: b.inviteEmailSent !== undefined ? b.inviteEmailSent : undefined,
            inviteEmailError: b.inviteEmailError || undefined,
            commissionRate: b.commissionRate || '',
            ntn: b.ntn || undefined,
            strn: b.strn || undefined,
            establishedYear: b.establishedYear || '',
            totalCounters: b.totalCounters || 0,
            settings: b.settings || {},
          }));
          setBusinesses(mapped);
        }
      }
    } catch (err) {
      console.warn('Could not load businesses from backend API:', err);
    }
  }, [currentUser, getAuthHeaders]);

  // 2. Fetch Real Users from PostgreSQL
  const refreshUsers = useCallback(async () => {
    try {
      const url = currentUser?.role === 'CUSTOMER_ADMIN' && currentUser?.companyId
        ? `/api/users?businessId=${encodeURIComponent(currentUser.companyId)}`
        : '/api/users';

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.warn('Could not load users from backend API:', err);
    }
  }, [currentUser, getAuthHeaders]);

  // 3. Fetch Real Invitations from PostgreSQL
  const refreshInvitations = useCallback(async () => {
    try {
      const url = currentUser?.role === 'CUSTOMER_ADMIN' && currentUser?.companyId
        ? `/api/invitations?businessId=${encodeURIComponent(currentUser.companyId)}`
        : '/api/invitations';

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.invitations && Array.isArray(data.invitations)) {
          const mapped: Invitation[] = data.invitations.map((i: any) => ({
            id: i.id,
            businessId: i.businessId,
            employeeName: i.name,
            email: i.email,
            assignedRole: i.role,
            invitationDate: i.invitationDate,
            expiryDate: i.expiryDate,
            status: i.status as any,
            token: i.token,
            invitedBy: i.invitedBy,
            emailSent: i.emailSent,
            emailError: i.emailError,
            inviteUrl: `${window.location.origin}/?token=${i.token}`,
          }));
          setInvitations(mapped);
        }
      }
    } catch (err) {
      console.warn('Could not load invitations from backend API:', err);
    }
  }, [currentUser, getAuthHeaders]);

  // 4. Fetch Real Notifications from PostgreSQL
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadNotificationCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn('Could not load notifications from API:', err);
    }
  }, [getAuthHeaders]);

  // 5. Fetch Real Audit Logs from PostgreSQL
  const refreshAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.auditLogs && Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
      }
    } catch (err) {
      console.warn('Could not load audit logs from API:', err);
    }
  }, [getAuthHeaders]);

  // 6. Fetch Real Devices & Sync Records from PostgreSQL
  const refreshDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.devices && Array.isArray(data.devices)) {
          setDevices(data.devices);
        }
      }
    } catch (err) {
      console.warn('Could not load devices from API:', err);
    }
  }, [getAuthHeaders]);

  const refreshSyncRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/devices/sync-records', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.syncRecords && Array.isArray(data.syncRecords)) {
          setSyncRecords(data.syncRecords);
        }
      }
    } catch (err) {
      console.warn('Could not load sync records from API:', err);
    }
  }, [getAuthHeaders]);

  // Initial load when user session is active
  useEffect(() => {
    if (currentUser) {
      refreshBusinesses();
      refreshUsers();
      refreshInvitations();
      refreshNotifications();
      refreshAuditLogs();
      refreshDevices();
      refreshSyncRecords();
    }
  }, [
    currentUser,
    refreshBusinesses,
    refreshUsers,
    refreshInvitations,
    refreshNotifications,
    refreshAuditLogs,
    refreshDevices,
    refreshSyncRecords,
  ]);

  // Poll notifications every 30 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, refreshNotifications]);

  // Load real business profile for active customer admin from PostgreSQL
  useEffect(() => {
    if (currentUser?.companyId && currentUser?.role !== 'SUPER_ADMIN') {
      fetch(`/api/businesses?businessId=${encodeURIComponent(currentUser.companyId)}`, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.businesses && data.businesses.length > 0) {
            const b = data.businesses[0];
            setCompanyProfile({
              id: b.id,
              name: b.name,
              ownerName: b.ownerName,
              email: b.email,
              phone: b.phone || '',
              mandiLocation: b.mandiLocation || '',
              address: b.address || '',
              city: b.city || '',
              ntn: b.ntn || '',
              strn: b.strn || '',
              commissionRate: b.commissionRate || '6.0%',
              accountStatus: b.status || 'Active',
              establishedYear: b.establishedYear || '2024',
              totalCounters: b.totalCounters || 1,
              settings: b.settings || {},
            });

            if (b.settings?.rolePermissions) {
              setRolesPermissions(normalizeRolesPermissions(b.settings.rolePermissions));
            }
          }
        })
        .catch((err) => console.warn('Could not load company profile from DB:', err));
    }
  }, [currentUser?.companyId, currentUser?.role, getAuthHeaders]);

  const safeSetCurrentTab = (tab: string) => {
    if (currentUser?.role === 'CUSTOMER_ADMIN') {
      const allowedCustomerTabs = ['overview', 'company', 'employees', 'roles', 'settings'];
      if (!allowedCustomerTabs.includes(tab)) {
        showToast('Access restricted: Super Admin section requires administrative privileges.', 'error');
        setCurrentTab('overview');
        return;
      }
    }
    setCurrentTab(tab);
  };

  const loginAs = (
    role: string,
    email?: string,
    rememberMe = false,
    userData?: Partial<CurrentUser>,
    token?: string
  ) => {
    const userRole = role.toUpperCase();
    const isSuper = userRole === 'SUPER_ADMIN';

    const newUser: CurrentUser = {
      id: userData?.id || '',
      name: userData?.name || (isSuper ? 'Platform Super Admin' : 'Customer Admin'),
      email: email || userData?.email || '',
      role: userRole,
      companyId: isSuper ? undefined : userData?.companyId,
      companyName: isSuper ? undefined : userData?.companyName,
      token: token || userData?.token,
    };

    setCurrentUser(newUser);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    if (newUser.token) {
      storage.setItem(AUTH_TOKEN_KEY, newUser.token);
    }

    setCurrentTab('overview');
    showToast(`Authenticated as ${newUser.name}`, 'success');
  };

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem('vegetable_pos_demo_auth');
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('vegetable_pos_demo_auth');

    setCurrentUser(null);
    setBusinesses([]);
    setUsers([]);
    setInvitations([]);
    setNotifications([]);
    setAuditLogs([]);
    setCompanyProfile(emptyCompanyProfile);
    setCurrentTab('overview');
    showToast('Signed out successfully', 'info');
  };

  // Add Business (Super Admin)
  const addBusiness = async (
    bizData: Omit<Business, 'id' | 'devicesCount' | 'lastSync'> & {
      initialAdminName?: string;
      initialAdminEmail?: string;
      sendInvitation?: boolean;
    }
  ): Promise<BusinessCreationResult> => {
    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: bizData.name,
          ownerName: bizData.ownerName,
          email: bizData.email,
          phone: bizData.phone,
          city: bizData.city,
          mandiLocation: bizData.mandiLocation,
          address: bizData.address,
          sendInvitation: bizData.sendInvitation !== false,
          initialAdminName: bizData.initialAdminName || bizData.ownerName,
          initialAdminEmail: bizData.initialAdminEmail || bizData.email,
          commissionRate: bizData.commissionRate,
          ntn: bizData.ntn,
          strn: bizData.strn,
          establishedYear: bizData.establishedYear,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast(data.message || 'Failed to create business in database.', 'error');
        return { success: false, message: data.message || 'Creation failed' };
      }

      await refreshBusinesses();
      await refreshUsers();
      await refreshAuditLogs();
      await refreshNotifications();

      showToast(`Business "${bizData.name}" created and saved to PostgreSQL!`, 'success');

      return {
        success: true,
        message: data.message,
        business: data.business,
        invitation: data.invitation,
        emailStatus: data.emailStatus,
        inviteUrl: data.inviteUrl,
      };
    } catch (err: any) {
      console.error('Error creating business:', err);
      showToast('Error communicating with database server.', 'error');
      return { success: false, message: err.message || 'Network error' };
    }
  };

  // Send Invitation to Business Owner
  const sendBusinessInvitation = async (
    businessId: string,
    email?: string,
    name?: string
  ): Promise<InvitationSendResult> => {
    try {
      const biz = businesses.find((b) => b.id === businessId);
      const recipientEmail = email || biz?.email;
      const recipientName = name || biz?.ownerName;

      if (!recipientEmail) {
        showToast('Recipient email is required to send invitation.', 'error');
        return { success: false, message: 'Recipient email required' };
      }

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          businessId,
          email: recipientEmail,
          name: recipientName,
          role: 'CUSTOMER_ADMIN',
          invitedById: currentUser?.id,
          invitedByName: 'Super Admin',
          invitedByRole: 'SUPER_ADMIN',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast(data.message || 'Failed to send business invitation.', 'error');
        return { success: false, message: data.message || 'Failed to send invitation' };
      }

      await refreshBusinesses();
      await refreshInvitations();
      await refreshAuditLogs();
      await refreshNotifications();

      if (data.emailStatus?.sent) {
        showToast(`Invitation email successfully dispatched to ${recipientEmail}!`, 'success');
      } else {
        showToast('Invitation token generated. SMTP setup required for direct emailing.', 'info');
      }

      return {
        success: true,
        message: data.message,
        invitation: data.invitation,
        emailStatus: data.emailStatus,
        inviteUrl: data.inviteUrl,
      };
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      showToast('Error communicating with invitation service.', 'error');
      return { success: false, message: err.message || 'Error sending invitation' };
    }
  };

  const updateBusiness = async (id: string, updates: Partial<Business>) => {
    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await refreshBusinesses();
        await refreshAuditLogs();
        await refreshNotifications();
        showToast('Business details updated successfully in database', 'success');
      } else {
        const data = await response.json().catch(() => ({}));
        showToast(data.message || 'Failed to update business', 'error');
      }
    } catch {
      showToast('Network error updating business', 'error');
    }
  };

  const deleteBusiness = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        await refreshBusinesses();
        await refreshUsers();
        await refreshInvitations();
        await refreshAuditLogs();
        await refreshNotifications();
        showToast(data.message || 'Business deleted successfully', 'success');
        return true;
      } else {
        showToast(data.message || 'Failed to delete business', 'error');
        return false;
      }
    } catch {
      showToast('Error deleting business', 'error');
      return false;
    }
  };

  const toggleBusinessStatus = async (id: string) => {
    const target = businesses.find((b) => b.id === id);
    if (!target) return;
    const newStatus = target.status === 'Active' ? 'Suspended' : 'Active';

    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        await refreshBusinesses();
        await refreshAuditLogs();
        await refreshNotifications();
        showToast(`Business "${target.name}" is now ${newStatus}`, newStatus === 'Active' ? 'success' : 'warning');
      } else {
        showToast('Failed to update business status on server', 'error');
      }
    } catch {
      showToast('Network error updating business status', 'error');
    }
  };

  const addUser = (userData: Omit<AppUser, 'id' | 'dateAdded' | 'lastActive'>) => {
    showToast('To add a user, use the Send Staff Invitation feature.', 'info');
  };

  const updateUser = async (id: string, updates: Partial<AppUser>) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await refreshUsers();
        await refreshAuditLogs();
        showToast('Employee information updated in database', 'success');
      } else {
        const data = await response.json().catch(() => ({}));
        showToast(data.message || 'Failed to update employee', 'error');
      }
    } catch {
      showToast('Error updating employee', 'error');
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        await refreshUsers();
        await refreshAuditLogs();
        await refreshNotifications();
        showToast(data.message || 'User removed successfully', 'success');
        return true;
      } else {
        showToast(data.message || 'Failed to remove user', 'error');
        return false;
      }
    } catch {
      showToast('Error removing user', 'error');
      return false;
    }
  };

  const toggleUserStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}/toggle-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        await refreshUsers();
        await refreshAuditLogs();
        showToast(`User status updated to ${data.status}`, data.status === 'Active' ? 'success' : 'warning');
      } else {
        const data = await response.json().catch(() => ({}));
        showToast(data.message || 'Failed to update status', 'error');
      }
    } catch {
      showToast('Error changing user status', 'error');
    }
  };

  const toggleDeviceStatus = (id: string) => {
    showToast('Device controls are synced through registered POS terminals.', 'info');
  };

  const registerDevice = (deviceData: Omit<Device, 'id' | 'activationDate' | 'lastActive' | 'status'>) => {
    showToast('Terminals register automatically when POS software connects.', 'info');
  };

  const updateSubscription = (id: string, updates: Partial<Subscription>) => {
    showToast('Subscription managed via SudoLeads central billing.', 'info');
  };

  const triggerSyncRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/devices/sync-retry/${id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await refreshSyncRecords();
        await refreshAuditLogs();
        showToast('Sync handshake succeeded. Records refreshed.', 'success');
      } else {
        showToast('Sync trigger returned offline status.', 'warning');
      }
    } catch {
      showToast('Network error triggering sync handshake', 'error');
    }
  };

  const sendInvitation = async (
    employeeName: string,
    email: string,
    assignedRole: 'Admin' | 'Employee' | string = 'Employee'
  ): Promise<InvitationSendResult> => {
    try {
      const targetBusinessId = currentUser?.companyId || '';
      if (!targetBusinessId) {
        showToast('Missing business context for invitation.', 'error');
        return { success: false, message: 'Missing business context' };
      }

      const inviterName = `${currentUser?.companyName || 'Mandi Business'} – Customer Admin`;

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          businessId: targetBusinessId,
          email: email.trim().toLowerCase(),
          name: employeeName.trim(),
          role: assignedRole,
          invitedById: currentUser?.id,
          invitedByName: inviterName,
          invitedByRole: currentUser?.role || 'CUSTOMER_ADMIN',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.message || 'Failed to send invitation.', 'error');
        return { success: false, message: data.message || 'Failed to send invitation.' };
      }

      await refreshInvitations();
      await refreshAuditLogs();
      await refreshNotifications();

      if (data.emailStatus?.sent) {
        showToast(`Invitation email successfully dispatched to ${email}!`, 'success');
      } else {
        showToast('Invitation token generated. Check invitation details.', 'info');
      }

      return {
        success: true,
        message: data.message,
        invitation: data.invitation,
        emailStatus: data.emailStatus,
        inviteUrl: data.inviteUrl,
      };
    } catch (err: any) {
      console.error('Error sending employee invitation:', err);
      showToast('Error communicating with invitation server.', 'error');
      return { success: false, message: err.message || 'Error sending invitation' };
    }
  };

  const cancelInvitation = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/invitations/${id}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        await refreshInvitations();
        await refreshAuditLogs();
        await refreshNotifications();
        showToast('Invitation cancelled successfully.', 'info');
      } else {
        const data = await response.json().catch(() => ({}));
        showToast(data.message || 'Failed to cancel invitation', 'error');
      }
    } catch {
      showToast('Error cancelling invitation', 'error');
    }
  };

  const resendInvitation = async (id: string): Promise<InvitationSendResult> => {
    try {
      const inv = invitations.find((i) => i.id === id);
      if (!inv) {
        showToast('Invitation not found', 'error');
        return { success: false, message: 'Invitation not found' };
      }

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          businessId: inv.businessId,
          email: inv.email,
          name: inv.employeeName,
          role: inv.assignedRole,
          invitedById: currentUser?.id,
          invitedByName: `${currentUser?.companyName || 'Mandi Business'} – Customer Admin`,
          invitedByRole: currentUser?.role || 'CUSTOMER_ADMIN',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.message || 'Failed to resend invitation.', 'error');
        return { success: false, message: data.message || 'Failed to resend invitation.' };
      }

      await refreshInvitations();
      await refreshAuditLogs();
      await refreshNotifications();
      showToast(`Fresh invitation email dispatched to ${inv.email}!`, 'success');

      return {
        success: true,
        message: data.message,
        invitation: data.invitation,
        emailStatus: data.emailStatus,
        inviteUrl: data.inviteUrl,
      };
    } catch (err: any) {
      showToast('Error communicating with invitation server.', 'error');
      return { success: false, message: err.message || 'Error resending invitation' };
    }
  };

  const updateRolePermissions = async (roleId: string, allowedFeatures: string[]): Promise<boolean> => {
    // 1. Calculate updated roles ensuring Admin always has full access to all features
    const updatedRoles = rolesPermissions.map((r) => {
      if (r.id === 'role-admin' || r.name.toLowerCase() === 'admin') {
        return {
          ...r,
          isSystemRole: true,
          allowedFeatures: ALL_FEATURE_IDS,
        };
      }
      if (r.id === roleId || r.name.toLowerCase() === roleId.toLowerCase()) {
        return {
          ...r,
          allowedFeatures: allowedFeatures,
        };
      }
      return r;
    });

    setRolesPermissions(updatedRoles);

    const targetId = currentUser?.companyId || companyProfile.id;
    if (!targetId) {
      showToast('Permissions updated locally', 'info');
      return true;
    }

    try {
      const res = await fetch(`/api/businesses/${targetId}/permissions`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rolePermissions: updatedRoles }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Permissions updated and saved to database', 'success');
        if (data.rolePermissions) {
          setRolesPermissions(normalizeRolesPermissions(data.rolePermissions));
        }
        setCompanyProfile((prev) => ({
          ...prev,
          settings: {
            ...(prev.settings || {}),
            rolePermissions: updatedRoles,
          },
        }));
        await refreshAuditLogs();
        return true;
      } else {
        showToast(data.message || 'Failed to save permissions to database', 'error');
        return false;
      }
    } catch (err) {
      console.error('Error saving permissions to database:', err);
      showToast('Network error saving permissions', 'error');
      return false;
    }
  };

  const updateCompanyProfile = async (updates: Partial<CompanyProfile>) => {
    const targetId = currentUser?.companyId || companyProfile.id;
    if (targetId) {
      try {
        const res = await fetch(`/api/businesses/${targetId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: updates.name,
            ownerName: updates.ownerName,
            phone: updates.phone,
            address: updates.address,
            mandiLocation: updates.mandiLocation,
            city: updates.city,
            commissionRate: updates.commissionRate,
            ntn: updates.ntn,
            strn: updates.strn,
            establishedYear: updates.establishedYear,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setCompanyProfile((prev) => ({ ...prev, ...updates }));
          showToast('Company details saved to PostgreSQL database', 'success');
          await refreshBusinesses();
          await refreshAuditLogs();
        } else {
          showToast(data.message || 'Failed to update company in database', 'error');
        }
      } catch (err) {
        console.error('Error updating company profile in DB:', err);
        showToast('Error communicating with database', 'error');
      }
    }
  };

  const updateBusinessSettings = async (settings: any): Promise<boolean> => {
    const targetId = currentUser?.companyId || companyProfile.id;
    if (!targetId) return false;
    try {
      const res = await fetch(`/api/businesses/${targetId}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Settings saved to database', 'success');
        await refreshAuditLogs();
        return true;
      } else {
        showToast(data.message || 'Failed to save settings', 'error');
        return false;
      }
    } catch {
      showToast('Network error saving settings', 'error');
      return false;
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      await refreshNotifications();
    } catch (err) {
      console.warn('Could not mark notification read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      await refreshNotifications();
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      console.warn('Could not mark all notifications read:', err);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await refreshNotifications();
    } catch (err) {
      console.warn('Could not dismiss notification:', err);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAuditLogs();
        await refreshNotifications();
        showToast('Password updated successfully in database!', 'success');
        return { success: true, message: data.message };
      } else {
        showToast(data.message || 'Failed to change password', 'error');
        return { success: false, message: data.message || 'Password update failed' };
      }
    } catch (err: any) {
      showToast('Network error changing password', 'error');
      return { success: false, message: err.message || 'Network error' };
    }
  };

  const updateProfile = async (name: string, phone: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (currentUser) {
          const updatedUser = { ...currentUser, name: data.user.name };
          setCurrentUser(updatedUser);
          sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        }
        await refreshUsers();
        await refreshAuditLogs();
        showToast('Profile information saved in PostgreSQL!', 'success');
        return { success: true, message: data.message };
      } else {
        showToast(data.message || 'Failed to update profile', 'error');
        return { success: false, message: data.message || 'Profile update failed' };
      }
    } catch (err: any) {
      showToast('Network error updating profile', 'error');
      return { success: false, message: err.message || 'Network error' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentTab,
        setCurrentTab: safeSetCurrentTab,
        loginAs,
        logout,
        businesses,
        users,
        devices,
        subscriptions,
        syncRecords,
        auditLogs,
        invitations,
        rolesPermissions,
        companyProfile,
        notifications,
        unreadNotificationCount,
        toasts,
        showToast,
        removeToast,
        refreshBusinesses,
        refreshUsers,
        refreshInvitations,
        refreshNotifications,
        refreshAuditLogs,
        refreshDevices,
        refreshSyncRecords,
        addBusiness,
        updateBusiness,
        deleteBusiness,
        toggleBusinessStatus,
        sendBusinessInvitation,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        toggleDeviceStatus,
        registerDevice,
        updateSubscription,
        triggerSyncRetry,
        sendInvitation,
        cancelInvitation,
        resendInvitation,
        updateRolePermissions,
        updateCompanyProfile,
        updateBusinessSettings,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        dismissNotification,
        changePassword,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
