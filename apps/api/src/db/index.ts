import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://aesh_user:aesh_password@localhost:5432/aesh_db';

const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

// Auto-patch critical columns on application startup
pool.query(`
  ALTER TABLE IF EXISTS "bookings" ADD COLUMN IF NOT EXISTS "boarding_code" varchar(20);
  CREATE UNIQUE INDEX IF NOT EXISTS "unique_booking_boarding_code_idx" ON "bookings" ("boarding_code");
`).catch(() => {});
