import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgres://aesh_user:aesh_password@localhost:5432/aesh_db';
const target = process.argv[2] || 'aes400196';

console.log(`🧹 Cleaning database records for pattern: ${target}...`);

const client = new pg.Client({ connectionString: dbUrl });

async function run() {
  await client.connect();

  const pattern = `%${target}%`;
  const res = await client.query('SELECT id, email, full_name FROM users WHERE email ILIKE $1 OR academic_id ILIKE $1', [pattern]);
  
  if (res.rows.length === 0) {
    console.log(`ℹ️ No users found matching: ${target}`);
  } else {
    for (const u of res.rows) {
      console.log(`Found matching user: ${u.full_name} (${u.email}) [ID: ${u.id}]`);

      await client.query('DELETE FROM boarding_logs WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1) OR scanned_by = $1', [u.id]);
      await client.query('DELETE FROM swap_logs WHERE old_booking_id IN (SELECT id FROM bookings WHERE user_id = $1) OR new_booking_id IN (SELECT id FROM bookings WHERE user_id = $1) OR performed_by = $1', [u.id]);
      await client.query('DELETE FROM audit_logs WHERE user_id = $1', [u.id]);
      const bRes = await client.query('DELETE FROM bookings WHERE user_id = $1 RETURNING id', [u.id]);
      console.log(`   Deleted ${bRes.rowCount} bookings.`);
      await client.query('DELETE FROM users WHERE id = $1', [u.id]);
      console.log(`   ✅ Deleted user account ${u.email}`);
    }
  }

  const vRes = await client.query('DELETE FROM verification_tokens WHERE email ILIKE $1 OR academic_id ILIKE $1', [pattern]);
  console.log(`   Deleted ${vRes.rowCount} verification tokens / OTP entries.`);

  console.log(`\n🎉 Success! User '${target}' has been completely purged from database.`);
  console.log('You can now register as a brand-new student and test the real Outlook OTP flow!');
  await client.end();
}

run().catch(err => {
  console.error('Error during cleanup:', err.message);
  process.exit(1);
});
