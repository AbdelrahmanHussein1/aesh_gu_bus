# Bus Aesh — Galala University Transit

Bus booking for university riders, with supervisor boarding verification and an administration portal. Release **1.3.0** includes the Expo mobile app, Next.js web app, Fastify API, and shared request types.

## Repository

- `apps/api`: authentication, trips, booking, QR verification, SMTP email, and PostgreSQL email outbox.
- `apps/web`: rider, supervisor, and administrator interfaces with Arabic and English support.
- `apps/mobile`: Expo SDK 51 / React Native 0.74 app for Android and iOS shared code.
- `packages/shared`: shared types and request validation.
- `scripts`: deployment, packaging, asset generation, and operational tools.
- `Images`: original branding assets used by asset tooling.

## Development

Use Node.js 22, PostgreSQL 16, and Redis 7. Install dependencies with `npm ci` and build shared types with `npm run build --workspace=packages/shared`.

Create private API configuration in `apps/api/.env`:

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/DATABASE
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailbox
SMTP_PASS=your-private-credential
EMAIL_FROM=Bus Aesh <your-mailbox>
```

Run `npm run db:migrate`, then start `npm run dev:api` and `npm run dev:web` in separate terminals. The API uses port 3000 and web development uses port 3001. Review `apps/web/next.config.js` for local API proxy configuration.

For mobile, set `EXPO_PUBLIC_API_URL` to the server's HTTP(S) origin, or use the editable server origin in the app. An Android emulator reaches the host using `http://10.0.2.2:3000`. Run `npm run dev:mobile`. Native Android builds require JDK 17 and Android SDK 34. Native iOS builds require macOS/Xcode.

## Booking and email behavior

Live seat failures show an error with retry instead of fabricated availability. Tickets and QR codes come from the API. Paid trips remain visible but cannot be booked in mobile; zero-fare tickets retain the paid status required for boarding verification. Explicit web offline mode is development behavior.

All existing email types use SMTP: registration OTP, temporary password reset, one-way and round-trip confirmation, and supervisor seat-swap notice. On API startup, SMTP is verified and email health appears in `/health`. SMTP downtime degrades email health while the API continues serving requests.

Ticket and swap jobs are enqueued transactionally in PostgreSQL and resume after restarts. Exhausted jobs are retained. Administrators can list them at `GET /api/admin/email-outbox/failed` and retry a job with `POST /api/admin/email-outbox/:jobId/retry`. Health exposes sanitized counts rather than message contents. SMTP acceptance and mailbox receipt are separate checks.

## Verification

```bash
npm run build --workspace=packages/shared
npm run build --workspace=apps/api
npm run ts:check --workspace=apps/mobile
npm run check:api-url --workspace=apps/mobile
node apps/web/scripts/check-seat-availability.cjs
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build --workspace=apps/web
```

From `apps/mobile`, run `npx expo install --check` to check the SDK dependency baseline. Runtime QA uses the labeled **CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE** fixture. Operational scripts that reset bookings or remove users change database data; read them and use only against an approved test environment.

## Deployment and releases

See [DEPLOY.md](DEPLOY.md) for Docker Compose deployment and [CHANGELOG.md](CHANGELOG.md) for release changes and verification limits. `start.sh` builds and starts the checked-out source; select the intended release before running it.

`npm run package:release` and `npm run package:vbox` create versioned source archives from tracked files. Stage new source files before packaging. Private environment files, downloaded APKs, and generated compiler caches are excluded. Tagged releases build source archives and a separate Android QA artifact in GitHub Actions. Android artifacts currently use development signing; production signing must be configured before store distribution.

Brand source images and historical audit documents are retained for maintenance. ERP seed data is required by the optional seeding tool and is not a current operational timetable. Database seeding is disabled by default.
