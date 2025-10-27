import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import Transport, { TransportStreamOptions } from 'winston-transport';
import { query } from '../db/pool.js';
import config from '../config/index.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'security';
export type LogCategory = 'USER_LOG' | 'SYSTEM_LOG' | 'ACTIVITY_TRACKER';

export interface LogEntry {
  level: LogLevel;
  userId?: string;
  ipAddress?: string;
  action: string;
  details?: Record<string, any>;
  category?: LogCategory;
}
/**
 * Custom Winston transport for database logging
 */
class DatabaseTransport extends Transport {
  constructor(opts?: TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    (async () => {
      try {
        await query(
          `INSERT INTO audit_logs (timestamp, level, user_id, ip_address, action, details, category) 
           VALUES (now(), $1, $2, $3, $4, $5, $6)`,
          [
            info.level,
            info.userId || null,
            info.ipAddress || null,
            info.action,
            info.details ? JSON.stringify(info.details) : null,
            info.category || 'SYSTEM_LOG',
          ]
        );
      } catch (error) {
        // Fallback: if DB is down, at least log to console
        console.error('Failed to write to audit_logs table:', error);
      } finally {
        callback();
      }
    })();
  }
}


// Ensure log directory exists
const logDir = dirname(config.logging.filePath);
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Create Winston logger with multiple transports
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pm-backend' },
  transports: [
    // File transport with daily rotation
    new DailyRotateFile({
      filename: config.logging.filePath.replace('.log', '-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
    }),
    // Database transport
    new DatabaseTransport({
      level: 'info',
    }),
  ],
});

// Add console transport in development
if (config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

/**
 * Log an audit event to both file and database
 */
export function log(entry: LogEntry): void {
  const { level, userId, ipAddress, action, details, category } = entry;

  logger.log({
    level,
    userId,
    ipAddress,
    action,
    details,
    category: category || 'SYSTEM_LOG',
    message: action,
  });
}

/**
 * Log authentication failure
 */
export function logAuthFailure(email: string, ipAddress: string, reason: string): void {
  log({
    level: 'security',
    ipAddress,
    action: 'LOGIN_FAILURE',
    details: { email, reason },
    category: 'USER_LOG',
  });
}

/**
 * Log successful login
 */
export function logLoginSuccess(userId: string, ipAddress: string, userAgent?: string): void {
  log({
    level: 'info',
    userId,
    ipAddress,
    action: 'LOGIN_SUCCESS',
    details: { userAgent },
    category: 'USER_LOG',
  });
}

/**
 * Log logout
 */
export function logLogout(userId: string, ipAddress: string): void {
  log({
    level: 'info',
    userId,
    ipAddress,
    action: 'LOGOUT',
    category: 'USER_LOG',
  });
}

/**
 * Log token refresh
 */
export function logTokenRefresh(userId: string, ipAddress: string): void {
  log({
    level: 'info',
    userId,
    ipAddress,
    action: 'TOKEN_REFRESH',
    category: 'USER_LOG',
  });
}

/**
 * Log admin action
 */
export function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string,
  ipAddress: string,
  details?: Record<string, any>
): void {
  log({
    level: 'security',
    userId: adminId,
    ipAddress,
    action,
    details: { targetUserId, ...details },
    category: 'USER_LOG',
  });
}

/**
 * Log task status change
 */
export function logTaskStatusChange(
  userId: string,
  taskId: string,
  oldStatus: string,
  newStatus: string
): void {
  log({
    level: 'info',
    userId,
    action: 'TASK_STATUS_CHANGE',
    details: { taskId, oldStatus, newStatus },
    category: 'ACTIVITY_TRACKER',
  });
}

/**
 * Log workspace creation
 */
export function logWorkspaceCreated(userId: string, workspaceId: string, name: string): void {
  log({
    level: 'info',
    userId,
    action: 'WORKSPACE_CREATED',
    details: { workspaceId, name },
    category: 'ACTIVITY_TRACKER',
  });
}

/**
 * Log project creation
 */
export function logProjectCreated(
  userId: string,
  projectId: string,
  workspaceId: string,
  name: string
): void {
  log({
    level: 'info',
    userId,
    action: 'PROJECT_CREATED',
    details: { projectId, workspaceId, name },
    category: 'ACTIVITY_TRACKER',
  });
}

/**
 * Log critical error
 */
export function logError(error: Error, userId?: string, context?: Record<string, any>): void {
  log({
    level: 'error',
    userId,
    action: 'ERROR',
    details: {
      message: error.message,
      stack: error.stack,
      ...context,
    },
    category: 'SYSTEM_LOG',
  });
}

/**
 * Log device revocation
 */
export function logDeviceRevoked(userId: string, deviceId: string, ipAddress: string): void {
  log({
    level: 'info',
    userId,
    ipAddress,
    action: 'DEVICE_REVOKED',
    details: { deviceId },
    category: 'USER_LOG',
  });
}

export default logger;
