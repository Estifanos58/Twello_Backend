import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    console.log('🔌 Connecting to Neon database...');
    
    // Test connection
    const test = await sql`SELECT NOW() as time`;
    console.log('✅ Connected! Server time:', test[0].time);
    
    // Read schema
    const schemaSQL = readFileSync('./src/sql/schema.sql', 'utf-8');
    console.log('📄 Schema file loaded');
    
    // Execute schema using unsafe query method for raw SQL
    console.log('🚀 Executing migration...');
    // Neon doesn't support executing large raw SQL, so we need to use Pool instead
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      await client.query(schemaSQL);
      console.log('✅ Migration completed successfully!');
    } finally {
      client.release();
    }
    
    // Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('\n📋 Created tables:');
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
