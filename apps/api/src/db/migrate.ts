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
