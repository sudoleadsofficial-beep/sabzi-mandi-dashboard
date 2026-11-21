import { Router, Request, Response } from 'express';
import { testConnection } from '../config/db.js';

export const healthRouter = Router();

/**
 * Health check endpoint: verifies service status and database connectivity
 */
healthRouter.get('/health', async (req: Request, res: Response) => {
  const dbHealth = await testConnection();

  const isHealthy = dbHealth.ok;

  const responsePayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'vegetable-pos-dashboard-api',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbHealth.ok,
      latencyMs: dbHealth.latencyMs,
      ...(dbHealth.ok
        ? {
            database: dbHealth.details?.database,
            user: dbHealth.details?.user,
            serverTime: dbHealth.details?.current_time,
          }
        : {
            error: dbHealth.error,
          }),
    },
  };

  res.status(isHealthy ? 200 : 503).json(responsePayload);
});
