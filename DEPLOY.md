# Production Deployment & Download Guide

This document explains how to download, deploy, and host the **Bus Aesh** transport platform on the internet for production.

---

## 1. Download Pre-Packaged Releases from GitHub

Every tagged release automatically generates a downloadable production bundle on GitHub:

1. Navigate to: **[https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases)**
2. Download `bus-aesh-v1.0.0-production.zip`.
3. Extract and run on any server with Node.js 20+:
   ```bash
   unzip bus-aesh-v1.0.0-production.zip -d bus-aesh
   cd bus-aesh
   npm install --omit=dev
   npm run start --workspace=apps/api   # Starts API on Port 3000
   npm run start --workspace=apps/web   # Starts Web Portal on Port 3001
   ```

---

## 2. Deploy with Docker Compose (Recommended for Internet VPS)

To host on an internet VPS (e.g. DigitalOcean, Hetzner, AWS EC2, or Azure):

```bash
# 1. Clone repository
git clone https://github.com/AbdelrahmanHussein1/aesh_gu_bus.git
cd aesh_gu_bus

# 2. Build and launch containers in background
docker compose up -d --build

# 3. Apply migrations and seed data
docker compose exec app npm run db:migrate --workspace=apps/api
docker compose exec app npm run db:seed --workspace=apps/api
```

Your service will now be live:
- **API**: `http://<your-server-ip>:3000`
- **Web App**: `http://<your-server-ip>:3001`

---

## 3. Deploy to PaaS (Railway / Render / Fly.io)

### Railway
1. Click **New Project** -> **Deploy from GitHub Repo**.
2. Select `AbdelrahmanHussein1/aesh_gu_bus`.
3. Add a **PostgreSQL** database service.
4. Set environment variables:
   - `PORT`: `3000`
   - `JWT_SECRET`: `<your-secure-secret>`
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `NEXT_PUBLIC_API_URL`: `<your-railway-url>`
5. Deploy.

---

## 4. Local Release Packaging Command

To generate a new downloadable distribution archive locally:
```bash
npm run package:release
```
The resulting archive will be created in `dist-release/bus-aesh-v1.0.0-production.zip`.
