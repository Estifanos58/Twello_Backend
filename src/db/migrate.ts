import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database migrations
 */
async function migrate() {
  try {
    console.log('Starting database migration...');

    // Read schema SQL file
    const schemaPath = join(__dirname, '../sql/schema.sql');
    console.log('Reading schema from:', schemaPath);
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    console.log('Schema loaded, executing...');

    // Execute schema
    await query(schemaSql);

    console.log('✅ Database migration completed successfully');
    
    // Close the pool to allow process to exit
    console.log('Closing pool...');
    await closePool();
    console.log('Pool closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };