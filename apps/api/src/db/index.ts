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
