import { Request, Response, NextFunction } from 'express';
import { logError } from '../services/loggingService.js';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logError(err, req.user?.id, {
    method: req.method,
    path: req.path,
    body: req.body,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (err.message.includes('Forbidden') || err.message.includes('forbidden')) {
    res.status(403).json({
      error: 'Forbidden',
      message: err.message,
    });
    return;
  }

  if (err.message.includes('not found') || err.message.includes('Not found')) {
    res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
    return;
  }

  if (err.message.includes('Invalid') || err.message.includes('required')) {
    res.status(400).json({
      error: 'Bad Request',
      message: err.message,
    });
    return;
  }

  // Generic error
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Async route handler wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
