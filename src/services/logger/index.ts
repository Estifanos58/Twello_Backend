import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import Transport, { TransportStreamOptions } from 'winston-transport';
import { query } from '../../db/pool.js';
import config from '../../config/index.js';
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

/**
 * Create Winston logger with multiple transports
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'twello-backend' },
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
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

/**
 * Log an entry with custom fields
 * @param entry Log entry details
 */
export function log(entry: LogEntry): void {
  logger.log({
    level: entry.level,
    message: entry.action,
    userId: entry.userId,
    ipAddress: entry.ipAddress,
    action: entry.action,
    details: entry.details,
    category: entry.category || 'SYSTEM_LOG',
  });
}

/**
 * Log an info message
 * @param action Action description
 * @param details Additional details
 */
export function logInfo(action: string, details?: Record<string, any>): void {
  log({ level: 'info', action, details });
}

/**
 * Log a warning message
 * @param action Action description
 * @param details Additional details
 */
export function logWarn(action: string, details?: Record<string, any>): void {
  log({ level: 'warn', action, details });
}

/**
 * Log an error message
 * @param action Action description
 * @param details Additional details
 */
export function logError(action: string, details?: Record<string, any>): void {
  log({ level: 'error', action, details });
}

/**
 * Log a security event
 * @param action Action description
 * @param userId User ID involved
 * @param ipAddress IP address
 * @param details Additional details
 */
export function logSecurity(
  action: string,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, any>
): void {
  log({
    level: 'security',
    action,
    userId,
    ipAddress,
    details,
    category: 'SYSTEM_LOG',
  });
}

export default logger;
