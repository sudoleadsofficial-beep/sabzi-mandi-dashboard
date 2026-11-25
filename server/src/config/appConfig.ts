import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env from server root is loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const serverConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'pos2026',
  database: process.env.DB_NAME || 'sabzi_mandi_dashboard',
  maxClients: parseInt(process.env.DB_MAX_CLIENTS || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '5000', 10),
};

export const corsConfig = {
  corsOrigin: process.env.CORS_ORIGIN || 'https://pos.sudoleads.com',
  frontendUrl: process.env.FRONTEND_URL || process.env.DASHBOARD_URL || 'https://pos.sudoleads.com',
  dashboardUrl: process.env.DASHBOARD_URL || process.env.FRONTEND_URL || 'https://pos.sudoleads.com',
  posUrl: process.env.POS_URL || 'http://localhost:8000',
};

export const smtpConfig = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'Vegetable POS <noreply@sudoleads.com>',
  fromName: process.env.SMTP_FROM_NAME || 'Vegetable POS',
};

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'pos-mandi-super-secret-jwt-key-2026-production',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '30d') as any,
};

export const apiRoutes = {
  base: '/api',
  health: '/api/health',
  auth: '/api/auth',
  businesses: '/api/businesses',
  invitations: '/api/invitations',
  users: '/api/users',
  notifications: '/api/notifications',
  auditLogs: '/api/audit-logs',
  devices: '/api/devices',
  posAuth: '/api/pos/auth',
  sync: '/api/v1/sync',
  legacySync: '/api/sync',
} as const;
