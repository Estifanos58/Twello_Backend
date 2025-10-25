import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { log } from '../services/logger/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

/**
 * Middleware to authenticate requests using JWT
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const payload = await verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request
    req.user = {
      id: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };

    next();
  } catch (error) {
    log({
      level: 'error',
      action: 'Authentication failed',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) {
        req.user = {
          id: payload.userId as string,
          email: payload.email as string,
          role: payload.role as string,
        };
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
}
