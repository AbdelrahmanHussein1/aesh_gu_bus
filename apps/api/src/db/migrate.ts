import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgres://aesh_user:aesh_password@localhost:5432/aesh_db';

async function runMigrate() {
  console.log('Running migrations...');
  
  const client = new pg.Client({
    connectionString,
  });
  
  await client.connect();
  
  // Drizzle Node-Postgres Migrator wrapper
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const db = drizzle(client);

  try {
    // Explicit raw DDL to guarantee boarding_code column and index exist
    try {
      await client.query(`
        ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "boarding_code" varchar(20);
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_booking_boarding_code_idx" ON "bookings" ("boarding_code");
        ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "booking_ref" varchar(30);
        CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_ref_unique" ON "bookings" ("booking_ref");
      `);
      console.log('✅ Guaranteed boarding_code column exists in bookings table');
    } catch (e: any) {
      console.warn('Notice ensuring boarding_code column:', e.message);
    }

    await migrate(db as any, {
      migrationsFolder: path.resolve(__dirname, '../../drizzle'),
    });
    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Error applying migrations:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrate();
