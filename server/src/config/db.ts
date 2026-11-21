import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sabzi_mandi_dashboard',
  max: parseInt(process.env.DB_MAX_CLIENTS || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '5000', 10),
};

export const pool = new Pool(dbConfig);

// Log unexpected pool errors on idle clients
pool.on('error', (err: Error) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
});

/**
 * Helper to test active database connectivity
 */
export async function testConnection(): Promise<{ ok: boolean; latencyMs: number; details?: any; error?: string }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, current_database() as database, current_user as user, version() as version');
      const latencyMs = Date.now() - start;
      return {
        ok: true,
        latencyMs,
        details: result.rows[0],
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Database connection error',
    };
  }
}
