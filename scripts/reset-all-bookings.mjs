import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgres://aesh_user:aesh_password@localhost:5432/aesh_db';

console.log('🧹 Purging all test bookings and logs (keeping routes, buses, and personnel)...');

const client = new pg.Client({ connectionString: dbUrl });

async function run() {
  await client.connect();

  await client.query('DELETE FROM boarding_logs');
  await client.query('DELETE FROM swap_logs');
  await client.query('DELETE FROM audit_logs');
  const bRes = await client.query('DELETE FROM bookings');
  console.log(`✅ Deleted ${bRes.rowCount} total bookings.`);

  console.log('🎉 All seats are now free and reset to 100% availability!');
  await client.end();
}

run().catch(err => {
  console.error('Error during reset:', err.message);
  process.exit(1);
});