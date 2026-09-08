#!/bin/sh
set -e

echo "========================================================"
echo "  🚌 Bus Aesh — Galala University Transport Stack"
echo "========================================================"

# 1. Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
until node -e "
const pg = require('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => { client.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "   PostgreSQL warming up... waiting 2 seconds"
  sleep 2
done
echo "✅ PostgreSQL is ready and accepting connections!"

# 2. Run Database Migrations & Ensure Schema Columns
echo "📦 Applying database migrations..."
node -e "
const pg = require('pg');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query('ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS boarding_code varchar(20);');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS unique_booking_boarding_code_idx ON bookings (boarding_code);');
  await client.end();
  console.log('   ✅ Column boarding_code confirmed in bookings table');
}).catch(err => { console.warn('   ⚠️ Notice during column check:', err.message); process.exit(0); });
"
node apps/api/dist/db/migrate.js || {
  echo "⚠️ Migrations encountered a notice, proceeding..."
}

# 3. Seed Database with Real Personnel & Schedules
echo "🌱 Seeding database (Routes, Buses, Drivers, Supervisors, June 2026 Rosters)..."
node apps/api/dist/db/seed.js || {
  echo "⚠️ Seeding completed or already seeded, proceeding..."
}

echo "========================================================"
echo "  ⚡ Starting Services:"
echo "     • Fastify API Backend : http://127.0.0.1:3000"
echo "     • Next.js Web Portal  : http://127.0.0.1:3002"
echo "     • Gateway Reverse Proxy: http://0.0.0.0:3001 (WS & HTTP)"
echo "========================================================"

# 4. Start Fastify API (Internal Port 3000)
node apps/api/dist/index.js &
API_PID=$!

# 5. Start Next.js Web App (Internal Port 3002)
PORT=3002 node node_modules/next/dist/bin/next start apps/web -p 3002 -H 0.0.0.0 &
WEB_PID=$!

# 6. Start WebSocket & HTTP Reverse Proxy Gateway (Public Port 3001)
node scripts/gateway.js &
GATEWAY_PID=$!

# Wait for background processes (POSIX / Alpine BusyBox compliant)
trap "kill -TERM $API_PID $WEB_PID $GATEWAY_PID 2>/dev/null; exit 0" TERM INT
wait $API_PID $WEB_PID $GATEWAY_PID

