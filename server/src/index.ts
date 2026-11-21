import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from './config/db.js';
import { runMigrations } from './db/migrate.js';
import { healthRouter } from './routes/healthRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { businessRouter } from './routes/businessRoutes.js';
import { invitationRouter } from './routes/invitationRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { notificationRouter } from './routes/notificationRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';
import { deviceRouter } from './routes/deviceRoutes.js';
import { posAuthRouter } from './routes/posAuthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        origin === CORS_ORIGIN ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow dev access
    },
    credentials: true,
  })
);

// Standard body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Mount API routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/businesses', businessRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/users', userRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/pos/auth', posAuthRouter);

// Root fallback / information
app.get('/', (req, res) => {
  res.json({
    service: 'Vegetable POS Admin Portal Backend API',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
    },
  });
});

// Centralized error handling
app.use(errorHandler);

// Start server after verifying DB connection and running migrations
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log(' Vegetable POS Admin Portal - Backend Server Startup');
    console.log('----------------------------------------------------');

    // Test DB connection
    const health = await testConnection();
    if (health.ok) {
      console.log(`[Database] Connected successfully to "${health.details?.database}" on port ${process.env.DB_PORT || 5432} as user "${health.details?.user}".`);
    } else {
      console.warn(`[Database Warning] Could not connect to PostgreSQL: ${health.error}`);
    }

    // Auto-run schema migrations on startup
    try {
      await runMigrations();
    } catch (migErr) {
      console.error('[Database Migration Warning] Migration encountered an error:', migErr);
    }

    const server = app.listen(PORT, () => {
      console.log(`[Server] Backend listening on http://localhost:${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Auth endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log('----------------------------------------------------');
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[Server Startup Error]: Port ${PORT} is already in use by another process.`);
        console.error(`- An existing backend instance or other service is already listening on port ${PORT}.`);
        console.error(`- On Windows: Run "netstat -ano | findstr :${PORT}" to find the PID.`);
        console.error(`- Or adjust the PORT variable in "server/.env".\n`);
      } else {
        console.error('\n[Server Startup Error]:', err);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await pool.end();
        console.log('[Database] PostgreSQL connection pool drained.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Server Startup Failure]:', error);
    process.exit(1);
  }
}

startServer();
