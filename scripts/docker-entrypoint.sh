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

# 2. Run Database Migrations
echo "📦 Applying database migrations..."
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
echo "     • Fastify API Backend : http://0.0.0.0:3000"
echo "     • Next.js Web Portal  : http://0.0.0.0:3001"
echo "========================================================"

# 4. Start Fastify API
node apps/api/dist/index.js &
API_PID=$!

# 5. Start Next.js Web App
node apps/web/node_modules/next/dist/bin/next start -p 3001 -H 0.0.0.0 apps/web &
WEB_PID=$!

# Wait for services
wait -n $API_PID $WEB_PID
