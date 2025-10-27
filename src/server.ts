import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import authRoutes from './routes/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { log } from './services/loggingService.js';

/**
 * Create and configure Express application
 */
export function createServer(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production',
      crossOriginEmbedderPolicy: config.env === 'production',
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Global rate limiting
  const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);

  // Auth-specific rate limiting
  const authLimiter = rateLimit({
    windowMs: config.rateLimit.authWindowMs,
    max: config.rateLimit.authMaxRequests,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const { healthCheck } = await import('./db/pool.js');
      const dbHealthy = await healthCheck();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? 'connected' : 'disconnected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Service unavailable',
      });
    }
  });

  // REST routes
  app.use('/auth', authLimiter, authRoutes);

  // GraphQL will be added here via Apollo Server middleware
  // This will be set up in index.ts

  // Note: 404 and error handlers are added in index.ts after GraphQL middleware

  // Log server start
  log({
    level: 'info',
    action: 'SERVER_START',
    details: {
      env: config.env,
      port: config.port,
    },
    category: 'SYSTEM_LOG',
  });

  return app;
}
