import pg from 'pg';
import { dbConfig as appDbConfig } from './appConfig.js';

const { Pool } = pg;

export const dbConfig = {
  host: appDbConfig.host,
  port: appDbConfig.port,
  user: appDbConfig.user,
  password: appDbConfig.password,
  database: appDbConfig.database,
  max: appDbConfig.maxClients,
  idleTimeoutMillis: appDbConfig.idleTimeoutMillis,
  connectionTimeoutMillis: appDbConfig.connectionTimeoutMillis,
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
