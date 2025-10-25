import { Request, Response, NextFunction } from 'express';
import { log } from '../services/logger/index.js';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  log({
    level: 'error',
    action: 'Error occurred',
    details: {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
  });

  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
