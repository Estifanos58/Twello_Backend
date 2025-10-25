import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { log } from './services/logger/index.js';

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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // API info endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Twello API',
      version: '1.0.0',
      description: 'Collaborative project management backend',
      endpoints: {
        graphql: '/graphql',
        health: '/health',
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  log({ level: 'info', action: 'Express server configured' });

  return app;
}
