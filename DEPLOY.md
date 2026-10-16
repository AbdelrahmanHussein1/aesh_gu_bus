# Deployment — Bus Aesh 1.3.0

Download the source archives from the GitHub release, or clone the repository and check out `v1.3.0`. Both archives contain the full source, including Android/iOS shared mobile code. They require a build; they do not contain credentials, node_modules, or a prebuilt web server.

## Docker Compose

1. Install Docker Engine and Docker Compose v2.
2. Create a private root `.env` with `JWT_SECRET` and Cloudflare settings if required. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optional `SMTP_SECURE`, and `EMAIL_FROM` in `apps/api/.env`.
3. Start with `docker compose up -d --build`.
4. Check `http://localhost:3001/health` and the API's sanitized email status. The gateway exposes the web app and API on port 3001; the API also listens on port 3000.

Startup applies database migrations, verifies SMTP, and resumes pending email outbox jobs. SMTP outages degrade email health while the API remains available. Seeding is disabled by default; do not enable it against existing rider data. Back up PostgreSQL before deploying migrations.

The bundled PostgreSQL and Redis port mappings/default credentials are intended for local development. For internet hosting, restrict database/cache ports and configure strong database credentials consistently in the app and PostgreSQL service. Terminate TLS at your proxy or Cloudflare tunnel.

## Local builds

Use Node.js 22 and run `npm ci`, then `npm run build --workspace=packages/shared`, `npm run build --workspace=apps/api`, and `npm run build --workspace=apps/web`. PostgreSQL, Redis, and private API configuration must be available before starting the services. Mobile setup remains in the repository README; Android builds require JDK 17 and the Android SDK.

## Packaging

Run `npm run package:release` and `npm run package:vbox`. The archives appear in `dist-release/` with versioned names. Only Git-tracked source files are included, so stage newly added release files before packaging. Neither archive includes `.env` files or downloaded APKs.

Android CI uploads a versioned QA APK artifact. It currently uses the development signing key; configure private release signing before store distribution.
