/**
 * Centralized API configuration for Vegetable POS Dashboard
 * Production API Gateway: https://api.sudoleads.com
 */

// Determine API Base URL with robust fallbacks:
// 1. Explicit Vite environment variable VITE_API_BASE_URL
// 2. Production build fallback: https://api.sudoleads.com
// 3. Development fallback: empty string (utilizes Vite dev proxy /api -> localhost:5000)
export const API_BASE_URL: string = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://api.sudoleads.com';
  }
  return '';
})();

/**
 * Returns the current active API base URL.
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Builds a normalized, fully qualified API URL.
 * Handles paths with or without leading slashes and prevents duplicate `/api`
 * prefixes if the base URL already includes `/api`.
 *
 * Examples:
 *   buildApiUrl('/api/auth/login') -> 'https://api.sudoleads.com/api/auth/login'
 *   buildApiUrl('api/auth/login')  -> 'https://api.sudoleads.com/api/auth/login'
 *   buildApiUrl('https://...')     -> 'https://...'
 */
export function buildApiUrl(path: string): string {
  if (!path) {
    return API_BASE_URL;
  }

  // If path is already an absolute HTTP or HTTPS URL, leave untouched
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If base URL is empty (e.g. dev mode proxy), return the relative path
  if (!API_BASE_URL) {
    return normalizedPath;
  }

  // Prevent duplicate /api if base URL ends with /api and path starts with /api/
  if (API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${API_BASE_URL}${normalizedPath.substring(4)}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Centralized API fetch wrapper.
 * Replaces window.fetch across the application to ensure all backend requests
 * target the centralized backend API (https://api.sudoleads.com in production)
 * while maintaining existing headers, credentials, payloads, and error handling.
 */
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const resolvedUrl = typeof input === 'string' ? buildApiUrl(input) : input;
  return fetch(resolvedUrl, init);
}

/**
 * Standardized API Endpoints Dictionary
 */
export const API_ENDPOINTS = {
  health: '/api/health',
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    profile: '/api/auth/profile',
    changePassword: '/api/auth/change-password',
  },
  businesses: {
    base: '/api/businesses',
    byId: (id: string) => `/api/businesses/${encodeURIComponent(id)}`,
    counters: (id: string) => `/api/businesses/${encodeURIComponent(id)}/counters`,
    settings: (id: string) => `/api/businesses/${encodeURIComponent(id)}/settings`,
    permissions: (id: string) => `/api/businesses/${encodeURIComponent(id)}/permissions`,
  },
  invitations: {
    base: '/api/invitations',
    send: '/api/invitations/send',
    verify: (token: string) => `/api/invitations/verify?token=${encodeURIComponent(token)}`,
    accept: '/api/invitations/accept',
    acceptEmployee: '/api/invitations/accept-employee',
    cancel: (id: string) => `/api/invitations/${encodeURIComponent(id)}/cancel`,
    smtpStatus: '/api/invitations/smtp-status',
  },
  users: {
    base: '/api/users',
    byId: (id: string) => `/api/users/${encodeURIComponent(id)}`,
    toggleStatus: (id: string) => `/api/users/${encodeURIComponent(id)}/toggle-status`,
    resetPassword: (id: string) => `/api/users/${encodeURIComponent(id)}/reset-password`,
  },
  notifications: {
    base: '/api/notifications',
    byId: (id: string) => `/api/notifications/${encodeURIComponent(id)}`,
    markRead: (id: string) => `/api/notifications/${encodeURIComponent(id)}/read`,
    markAllRead: '/api/notifications/mark-all-read',
  },
  auditLogs: {
    base: '/api/audit-logs',
  },
  devices: {
    base: '/api/devices',
    syncRecords: '/api/devices/sync-records',
    syncRetry: (id: string) => `/api/devices/sync-retry/${encodeURIComponent(id)}`,
  },
  posAuth: {
    checkStatus: '/api/pos/auth/check-status',
    activate: '/api/pos/auth/activate',
    login: '/api/pos/auth/login',
    permissions: '/api/pos/auth/permissions',
  },
  sync: {
    pull: '/api/v1/sync/pull',
    push: '/api/v1/sync/push',
    register: '/api/v1/sync/register',
    permissions: '/api/v1/sync/permissions',
  },
} as const;
