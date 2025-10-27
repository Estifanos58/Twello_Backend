import { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Pool, neonConfig } from '@neondatabase/serverless';
import config from '../config/index.js';

// Check if using Neon database
const isNeonDatabase = config.database.url.includes('neon.tech');

// For Neon, use their serverless driver for better compatibility
// For other databases, use standard pg driver
let pool: PgPool | Pool;

if (isNeonDatabase) {
  // Use Neon's serverless driver
  pool = new Pool({ connectionString: config.database.url });
  console.log('🔌 Using Neon serverless driver');
} else {
  // Use standard PostgreSQL driver for local/other databases
  pool = new PgPool({
    connectionString: config.database.url,
    min: config.database.poolMin,
    max: config.database.poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: config.env === 'production' ? { rejectUnauthorized: true } : undefined,
  });
  
  // Pool event handlers for monitoring (pg only)
  pool.on('connect', () => {
    // Silent connect
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    process.exit(-1);
  });
  console.log('🔌 Using standard PostgreSQL driver');
}

/**
 * Execute a parameterized SQL query
 * @param text SQL query string with $1, $2, etc. placeholders
 * @param params Array of parameter values
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (config.env === 'development' && duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      query: text.substring(0, 200),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction handling
 * @returns PoolClient
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute a transaction with automatic commit/rollback
 * @param callback Transaction callback function
 * @returns Result from callback
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection health
 * @returns true if healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Gracefully close all database connections
 */
export async function closePool(): Promise<void> {
  if ('end' in pool && typeof pool.end === 'function') {
    await pool.end();
  }
  // Neon serverless pools don't need explicit cleanup
}

/**
 * Helper to build WHERE conditions safely
 * @param conditions Object with column-value pairs
 * @returns Object with SQL WHERE clause and parameters
 */
export function buildWhereClause(conditions: Record<string, any>): {
  whereClause: string;
  params: any[];
} {
  const keys = Object.keys(conditions).filter((key) => conditions[key] !== undefined);
  if (keys.length === 0) {
    return { whereClause: '', params: [] };
  }

  const clauses = keys.map((key, index) => `${key} = $${index + 1}`);
  const params = keys.map((key) => conditions[key]);

  return {
    whereClause: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
}

export { pool };
export default pool;
