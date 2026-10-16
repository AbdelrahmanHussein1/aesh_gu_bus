# Bus Aesh — Galala University Transit

<p align="center"><img src="apps/web/public/app-logo.png" alt="Bus Aesh logo" width="112" /></p>

University bus booking, boarding verification, and transport operations. **Release 1.3.0** includes a Next.js web application, Expo mobile application, Fastify API, PostgreSQL data model, Redis coordination, and SMTP email automation.

[Release downloads](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/tag/v1.3.0) · [Build artifacts](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/actions) · [Deployment](DEPLOY.md) · [Changelog](CHANGELOG.md)

This guide describes checked-in functionality. Source support, successful builds, device verification, mailbox receipt, and live deployment are separate claims; see the verification and limitations sections.

## Contents

- [Platform and feature coverage](#platform-and-feature-coverage)
- [Web application](#web-application)
- [Mobile application](#mobile-application)
- [Architecture](#architecture)
- [Core workflows](#core-workflows)
- [Data model and integrity](#data-model-and-integrity)
- [API reference](#api-reference)
- [Realtime events](#realtime-events)
- [Email automation](#email-automation)
- [Repository map](#repository-map)
- [Development setup](#development-setup)
- [Configuration](#configuration)
- [Deployment and operations](#deployment-and-operations)
- [Release downloads and artifacts](#release-downloads-and-artifacts)
- [Verification](#verification)
- [Known limits](#known-limits)
- [Supporting documents and visual assets](#supporting-documents-and-visual-assets)

## Platform and feature coverage

| Capability | Web | Mobile |
| --- | --- | --- |
| Registration and academic OTP | Available | Available |
| Sign in / sign out | Session restored from browser session storage | Shared in-memory session |
| Temporary-password recovery | Web flow | No dedicated recovery screen |
| Route, date, direction, trip, and seat selection | Available | Available |
| Loading / empty / error / retry states | Available | Available |
| One-way booking | Available | Zero-fare trips only |
| Round-trip booking | Paired outbound/return legs | No booking UI |
| Receipt-based paid booking | Existing checkout and admin approval | Paid trips visible; booking disabled |
| Server-issued QR and ticket information | Available | Available |
| Camera and manual-code verification | Supervisor portal | Online supervisor scanner |
| Passenger manifests, swaps, manual boarding | Supervisor portal | Scanner-focused flow |
| Schedules, fleet, settings, database views | Administrator console | No dedicated admin console |
| Arabic / English and RTL | Available | Primarily English; full parity unverified |
| Theme | Dark/light | Current dark-blue identity |
| Offline demonstration | Explicit web mode | No fabricated trip/ticket fallback |

## Web application

### Rider portal

- Register with account details and academic verification / OTP; sign in, recover access, and sign out.
- Browse routes and stops; choose date, campus direction, shift, and available trip.
- Book one-way or round-trip journeys. Round-trip seat selection combines availability across both legs.
- See live seat availability, temporary holds, conflicts, refresh feedback, and distinct loading/empty/error states.
- Retry failed live requests without substituting mock seats; checkout is disabled when seat availability is not trustworthy.
- Use the existing receipt-based payment flow, with server-side administrator verification.
- View server-issued tickets, QR data, seat/trip details, boarding status, and cancellation feedback.
- Cancel within server ownership, boarding, and departure-cutoff rules.
- Use responsive navigation, Arabic/English translations, RTL styling, dark/light themes, and public privacy/terms pages.
- Web metadata includes icons, social preview artwork, robots, sitemap, and a web manifest; these do not establish offline PWA capability.

Source: [rider page](apps/web/app/(dashboard)/rider/page.tsx), [booking components](apps/web/components/booking), [rider hooks](apps/web/hooks), [translations](apps/web/lib/i18n).

### Supervisor portal

- Select trips and load authenticated passenger manifests.
- Scan a QR through the browser camera or manually enter a boarding code.
- Receive valid, invalid, already-used, and incompatible-ticket feedback from the server.
- Board individual passengers or use the server's bulk boarding operation.
- Move a passenger to another trip/seat, inspect boarding status, and cancel under supervisor policy.
- Generate printable passenger manifests with trip/personnel details and Arabic-oriented layout.
- Refresh manifest and boarding information through HTTP and realtime events.

Source: [supervisor page](apps/web/app/(dashboard)/supervisor/page.tsx), [supervisor components](apps/web/components/supervisor), [scanner hook](apps/web/hooks/useSupervisorScanner.ts).

### Administrator console

| Area | Tools |
| --- | --- |
| Shift and schedule hub | List/filter schedules; create/edit trips; assign buses and personnel; coordinate directions; clone schedules; delete trips; purge shifts |
| Fleet status | Occupancy and held seats, filters, refresh, and detailed seat inspector |
| Policies and audit | Read/update settings; inspect and export audit history |
| Database explorer | Inspect users/bookings; restricted test-student cleanup |
| Payment approval | API action verifies receipts and queues appropriate confirmations |
| Email recovery | Admin-only failed-job listing/retry API; no dedicated queue UI |

Destructive schedule/account tools affect stored records. Development fixture helpers are not an approved operational timetable generator.

Source: [admin page](apps/web/app/(dashboard)/admin/page.tsx), [admin components](apps/web/components/admin), [admin routes](apps/api/src/routes/admin.routes.ts).

## Mobile application

The Expo app preserves the dark-blue Bus Aesh identity and shares API contracts with the server. Android Studio's emulator is the primary local QA device.

- Account details, OTP registration, sign-in, and sign-out.
- A root session shared between home and scanner; restarting the app requires sign-in.
- One API client with validated HTTP(S) origin configuration. Paths, query strings, fragments, and embedded credentials are rejected.
- Route/date/direction/trip selection and live seats with loading, empty, error, conflict, and retry feedback.
- Single-seat, one-way zero-fare booking. Positive-fare trips remain visible but cannot be booked in mobile.
- Real server-issued tickets only. Ambiguous booking POST results prompt a server status check before another booking attempt.
- Ticket QR rendering through `react-native-qrcode-svg` and `react-native-svg`.
- Supervisor/admin scanner entry, camera permission handling, and manual-code entry using the same authenticated online verifier.
- Realtime session, boarding, and cancellation notices. Supported events can trigger local notifications; this is not a server push-notification delivery service.
- Safe-area, keyboard, spacing, and touch-state handling; focused account, booking, ticket, and style modules.

Source: [home](apps/mobile/app/index.tsx), [scanner](apps/mobile/app/scanner.tsx), [API client](apps/mobile/src/api.ts), [session context](apps/mobile/src/app-context.tsx), [components](apps/mobile/src/components).

## Architecture

```mermaid
flowchart TB
  Browser[Web browser] --> Edge[Optional TLS proxy / Cloudflare]
  Mobile[Expo Android / iOS client] --> Edge
  Edge --> Gateway[HTTP and WebSocket gateway :3001]
  Gateway -->|Pages and assets| Next[Next.js :3002]
  Gateway -->|/api and /ws| API[Fastify :3000]
  API --> PG[(PostgreSQL 16)]
  API --> Redis[(Redis 7)]
  API --> Mail[Shared SMTP mailer]
  PG --> Worker[Email outbox worker inside API]
  Worker --> Mail
  Mail --> SMTP[SMTP provider]
  API -. configured academic auth paths .-> External[University ERP / SheerID]
```

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web | Next.js 15, React 19, Tailwind CSS | Rider/supervisor/admin screens and same-origin API calls |
| Mobile | Expo SDK 51, React Native 0.74, React 18 | Android/iOS shared code, camera, native ticket rendering |
| API | Fastify 5, TypeScript, JWT | Authorization, transactions, scanning, configuration, email startup |
| Shared | TypeScript, Zod | Request schemas, types, QR helpers |
| Database | PostgreSQL 16, Drizzle ORM | Durable application data and transactional email outbox |
| Redis | ioredis | Seat holds, session cache, verification counters, query caches |
| Realtime | Fastify WebSocket hub | Trip rooms and user-session events |
| Email | Nodemailer / SMTP | Existing outbound email categories |
| Infrastructure | Docker Compose, Node gateway, optional Cloudflare | Service routing and optional public access |
| Automation | GitHub Actions | Source release and separate Android QA artifact |

Web and mobile intentionally use different React versions to match their frameworks. Mobile Metro resolution isolates React and supports the QR renderer on the tracked React Native baseline.

### Routing and ports

| Mode | Web | API | WebSocket |
| --- | --- | --- | --- |
| Local development | Next dev `3001` | Fastify `3000`; Next rewrites `/api/*` | API endpoint / configured dev proxy |
| Docker | Public gateway `3001` → internal Next `3002` | Gateway `/api/*` → Fastify `3000` | Gateway upgrades → Fastify |
| Android emulator | Native UI | Common host origin `http://10.0.2.2:3000` | Derived `ws://` / `wss://` origin |

**Health distinction:** gateway `/health` reports gateway liveness. Query Fastify directly on `3000/health` for API email/outbox health. The Docker gateway intercepts `/health` before Next's health rewrite.

## Core workflows

### Booking and confirmation

```mermaid
sequenceDiagram
  participant Rider
  participant API
  participant DB as PostgreSQL
  participant Worker as Email worker
  Rider->>API: Load real trips and seats
  API-->>Rider: Availability plus temporary hold state
  Rider->>API: Submit booking
  API->>DB: Transaction: validate fare/seat and create booking
  Note over API,DB: Paid confirmation job is enqueued in the same transaction
  DB-->>API: Commit
  API-->>Rider: Server booking and ticket data
  API-->>Rider: Realtime seat update
  Worker->>DB: Claim pending outbox job
  Worker->>Worker: Send through SMTP
  Worker->>DB: Mark sent or schedule retry
```

Receipt bookings initially use `receipt_uploaded`; admin approval marks them paid and queues confirmation. A round-trip confirmation waits for both legs to be paid. Zero-fare bookings use `paid` for scanner compatibility. Mobile sends `paymentMethod: 'none'` only for one-way bookings; the API reads the stored fare and rejects it unless the fare is exactly zero. Mock-card handling is gated behind `ENABLE_MOCK_PAYMENTS` and disabled by default; it is not a real card gateway.

### Boarding and passenger changes

The supervisor submits a QR token or manual code. The server checks authorization, stored booking/ticket state, payment, leg compatibility, and previous boarding. A successful verification records boarding and notifies connected clients; repeated scans are rejected. Swaps update the booking and swap history and enqueue a notice transactionally. Cancellation follows server policy and can affect paired bookings.

### Registration and account recovery

Registration uses the configured academic verification path and OTP support. OTP sends are synchronous: failed SMTP delivery rolls back the unsent token. Password recovery retains the temporary-password flow; failed email rolls back the password change. Review [auth routes](apps/api/src/routes/auth.routes.ts), [SheerID service](apps/api/src/services/sheerid.service.ts), and [ERP adapter](apps/api/src/auth/odoo.ts) before changing institutional policy. External ERP/verification availability is not guaranteed by this repo.

## Data model and integrity

```mermaid
erDiagram
  USERS ||--o{ BOOKINGS : owns
  ROUTES ||--o{ STOPS : contains
  ROUTES ||--o{ TRIPS : schedules
  BUSES ||--o{ TRIPS : serves
  TRIPS ||--o{ BOOKINGS : contains
  TRIPS ||--o{ TRIP_SUPERVISORS : assigns
  USERS ||--o{ TRIP_SUPERVISORS : supervises
  BOOKINGS ||--o{ BOARDING_LOGS : records
  BOOKINGS ||--o{ SWAP_LOGS : references
  USERS ||--o{ AUDIT_LOGS : performs
```

| Tables | Data |
| --- | --- |
| `users`, `verification_tokens` | Roles, account/session metadata, academic verification and OTP state |
| `routes`, `stops`, `buses` | Route details, ordered stops, capacity, vehicle identifiers |
| `trips`, `trip_supervisors` | Dated shifts, fare, direction, cancellation policy, personnel assignments |
| `bookings` | Seat, rider, status, payment, QR/version, boarding code, paired leg, cancellation |
| `boarding_logs`, `swap_logs`, `audit_logs` | Boarding attempts, moves, operational history |
| `system_settings` | Application policy values |
| `email_outbox` | Event key, payload reference, state, attempts, lease, retry time, sanitized error |

PostgreSQL is the booking authority. Transactions and seat uniqueness constraints protect booking integrity; round-trip creation handles both legs atomically. QR/version and stored state support rejection of invalid or stale tickets. Redis seat holds expire after five minutes and do not replace a durable booking.

Active-session identifiers are cached in Redis with PostgreSQL fallback; a new login can displace an older session. Protected routes check authentication, session, role, and endpoint-specific ownership/assignment. Auth request limits and verification/login counters provide abuse controls. These mechanisms are not a claim of production security certification.

Schema source: [schema.ts](apps/api/src/db/schema.ts). SQL migrations and snapshots: [apps/api/drizzle](apps/api/drizzle). Use the API workspace migration runner; the obsolete empty root migration journal was removed.

## API reference

This endpoint index is not generated OpenAPI documentation. Request/response contracts live in [route handlers](apps/api/src/routes) and [shared schemas](packages/shared/src/index.ts). Protected HTTP requests use `Authorization: Bearer <token>`; session and role checks still apply.

### Authentication and discovery

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/verify-student` | Begin academic verification / OTP |
| POST | `/api/auth/confirm-code` | Confirm verification code |
| POST | `/api/auth/register` | Register with required verification |
| POST | `/api/auth/login` | Authenticate and create session |
| POST | `/api/auth/forgot-password` | Temporary-password recovery |
| POST | `/api/auth/logout` | End current session |
| GET | `/api/auth/me` | Current account |
| GET | `/api/routes` | Routes and stops |
| GET | `/api/trips` | Dated trip discovery |
| GET | `/api/trips/:tripId/seats` | Seat availability |
| POST | `/api/trips/:tripId/seats/:seatNumber/lock` | Acquire hold |
| POST | `/api/trips/:tripId/seats/:seatNumber/unlock` | Release own hold |

### Booking and supervision

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/bookings` | Create booking |
| POST | `/api/bookings/round-trip` | Create paired legs |
| GET | `/api/bookings/my` | Rider's bookings |
| POST | `/api/bookings/cancel` | Cancel under policy |
| POST | `/api/bookings/swap` | Authorized passenger move |
| POST | `/api/scan/verify` | QR/manual-code verification |
| GET | `/api/trips/:tripId/manifest` | Authorized manifest |
| POST | `/api/supervisor/board-passenger` | Manual boarding |
| POST | `/api/supervisor/board-all-passengers` | Bulk boarding |
| POST | `/api/supervisor/cancel-booking` | Supervisor cancellation |

### Administration

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/admin/bookings/:bookingId/verify-payment` | Receipt approval |
| GET | `/api/admin/email-outbox/failed` | Sanitized exhausted jobs |
| POST | `/api/admin/email-outbox/:jobId/retry` | Retry failed job |
| GET | `/api/admin/fleet` | Fleet occupancy |
| GET | `/api/admin/trips/:tripId/seat-details` | Seat inspector data |
| GET | `/api/admin/audit-logs` | Audit history |
| GET | `/api/admin/database/users` | User explorer |
| GET | `/api/admin/database/bookings` | Booking explorer |
| POST | `/api/admin/database/clean-test-student` | Restricted test cleanup |
| GET / PUT | `/api/admin/settings` | Read/update policies |
| GET | `/api/admin/schedules` | Schedule listing |
| GET | `/api/admin/personnel` | Personnel directory |
| POST | `/api/admin/trips` | Create trips |
| PUT / DELETE | `/api/admin/trips/:id` | Edit/delete trip |
| POST | `/api/admin/schedules/clone` | Clone schedule |
| DELETE | `/api/admin/shifts/purge-all` | Destructive shift purge |
| POST | `/api/admin/shifts/create-single-test-shift` | Development helper |

## Realtime events

Authenticated channels are `/ws/trips/:tripId/seats` and `/ws/user/session`. The JWT is supplied as a WebSocket subprotocol, rather than a query parameter.

| Event family | Examples |
| --- | --- |
| Seat state | `seat_locked`, `seat_unlocked`, `seat_booked`, `booking_cancelled` |
| Boarding | `rider_boarded` |
| Session | `SESSION_TERMINATED` |
| Rider cancellation | `SUPERVISOR_CANCELLED_TICKET` |
| Schedules/fleet | `NEW_TRIP_ANNOUNCED`, `TRIP_CANCELLED`, `SCHEDULE_UPDATED`, `SCHEDULE_CLONED`, `FLEET_PURGED` |

The current [WebSocket hub](apps/api/src/websocket/hub.ts) is process-local. Redis coordination does not provide cross-instance WebSocket fan-out. Multiple API replicas need deliberate realtime distribution and deployment review.

## Email automation

| Email | Trigger | Delivery |
| --- | --- | --- |
| Registration OTP | Verification request | Direct SMTP; unsent token rolls back |
| Password reset | Recovery request | Direct SMTP; password change rolls back on failure |
| One-way confirmation | Paid booking/admin approval | Transactional outbox |
| Round-trip confirmation | Both paired legs paid | Paired confirmation outbox event |
| Swap notice | Supervisor passenger move | Outbox job in swap transaction |

SMTP is checked at startup and every 60 seconds. The API starts an outbox worker that polls every five seconds, claiming up to five jobs per cycle with `SKIP LOCKED`. Claims have a two-minute lease. Failures retry with backoff starting at 30 seconds, capped at one hour; ten attempts exhaust the job. Failed jobs are retained for admin inspection/retry.

Unique event keys prevent duplicate enqueueing for the same booking set or swap. SMTP delivery is **at least once**: a crash after provider acceptance but before recording `sent` can cause a repeated email. PostgreSQL and SMTP do not share a transaction. Queued notices resume after restart/recovery; failed OTP/reset requests must be requested again because they are not durable email jobs.

Health exposes sanitized status/counts/check time, not recipient/message content or credentials. Dynamic HTML is escaped. Provider acceptance is separate from mailbox receipt. Cancellation/refund emails are not implemented. Retired n8n/Resend paths were removed.

Source: [mailer](apps/api/src/services/mail.service.ts), [templates](apps/api/src/services/email.service.ts), [outbox worker](apps/api/src/services/email-outbox.service.ts).

## Repository map

```text
apps/
  api/
    drizzle/             SQL migrations and snapshots
    src/auth/            ERP adapter
    src/db/              Schema, migration runner, optional seeding
    src/routes/          Auth, trips, bookings, supervisor, administrator
    src/services/        Sessions, locks, cache, audit, SMTP/outbox
    src/websocket/       Trip rooms and user events
  web/
    app/                 Auth, role dashboards, public pages, metadata
    components/          Auth, booking, supervisor, admin, layout, UI
    hooks/               Provider and booking/trip/seat/scanner domains
    lib/                 API, i18n, types, configuration, offline demo
    public/              Runtime branding, icons, web manifest
    scripts/             Focused seat checks
  mobile/
    app/                 Expo Router layout, home, scanner
    src/                 API, session, components, styles, types
    assets/              Mobile icons
    android/             Tracked native Android project
    scripts/             API-origin check
packages/shared/         Shared contracts and QR helpers
scripts/                 Gateway, startup, packaging, checks, operations
Images/                  Original brand artwork
.github/workflows/       Source release and Android QA automation
docker-compose.yml       App, PostgreSQL, Redis, optional public tunnel
Dockerfile               Multi-stage web/API image
erp_bus_data.json        Optional seeding input, not a current timetable
DEPLOY.md / CHANGELOG.md Deployment and release records
```

Generated dependencies, web/native build outputs, downloaded APKs, compiler caches, and `dist-release` archives are ignored. Original brand sources and dated audit evidence are retained intentionally.

## Development setup

### Prerequisites

Node.js 22/npm, PostgreSQL 16, Redis 7, and optionally Docker with Compose v2. Native Android requires JDK 17, SDK 34, and a device/emulator. Native iOS requires macOS/Xcode.

```bash
git clone https://github.com/AbdelrahmanHussein1/aesh_gu_bus.git
cd aesh_gu_bus
npm ci
npm run build --workspace=packages/shared
```

Create private API configuration as below. Start PostgreSQL/Redis and run `npm run db:migrate`. Run API development from its workspace so its `.env` loads consistently:

```bash
cd apps/api
npm run dev
```

In another terminal at the repository root, run `npm run dev:web`; open `http://localhost:3001`. The API uses `http://localhost:3000`. Do not seed an existing database to populate missing dates; publish approved schedules through administration.

### Mobile and emulator

Run `npm run dev:mobile`. Set `EXPO_PUBLIC_API_URL` before starting/bundling Expo, or use the editable server origin. Standard Android emulator access to the host API is `http://10.0.2.2:3000`; a physical phone needs a reachable LAN/HTTPS origin. Expo Go must match SDK 51. The tracked native APK is the native acceptance target.

With JDK 17 and `ANDROID_HOME` configured:

```bash
cd apps/mobile/android
./gradlew :app:assembleDebug
# Windows: .\gradlew.bat :app:assembleDebug
adb -s emulator-5554 install -r app/build/outputs/apk/debug/app-debug.apk
```

Use `:app:assembleRelease` for release-variant QA assembly. It currently uses development signing; configure a private production key before store distribution.

## Configuration

API secrets belong in `apps/api/.env` or the server's private environment. Client `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` values are public and must not contain secrets.

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/DATABASE
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailbox
SMTP_PASS=your-private-credential
EMAIL_FROM=Bus Aesh <your-mailbox>
```

| Variables | Purpose |
| --- | --- |
| `DATABASE_URL`, `REDIS_URL` | Database and Redis connections |
| `JWT_SECRET` | Required API signing secret |
| `PORT`, `HOST`, `CORS_ORIGINS` | API listener and browser origins |
| `SMTP_HOST`, `SMTP_PORT` | SMTP endpoint; defaults Office365/587 |
| `SMTP_USER`, `SMTP_PASS` | Private credentials; missing values mark email unavailable |
| `SMTP_SECURE`, `EMAIL_FROM` | SMTP secure mode/sender; port 465 uses secure transport |
| `SHEERID_API_KEY`, `SHEERID_PROGRAM_ID` | Academic verification provider |
| `MOCK_ERP` | Explicit development ERP simulation; rejected in production ERP auth |
| `ENABLE_MOCK_PAYMENTS` | Optional mock-card path; leave disabled for real service |
| `INTERNAL_API_URL` | Next server/rewrite API target |
| `NEXT_PUBLIC_API_URL` | Server-side web fallback; browser requests use page origin |
| `NEXT_PUBLIC_ENABLE_OFFLINE_MODE` | Explicit web demonstration mode |
| `NEXT_PUBLIC_SITE_URL` | Public canonical/metadata origin |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE` | Public support contacts; replace placeholder defaults |
| `NEXT_PUBLIC_DEV_EMAIL` | Development UI affordances; does not grant API authorization |
| `EXPO_PUBLIC_API_URL` | Mobile HTTP(S) origin only |
| `GATEWAY_PORT`, `API_PORT`, `WEB_PORT` | Gateway defaults 3001/3000/3002 |
| `CLOUDFLARE_TUNNEL_TOKEN`, `CLOUDFLARE_TUNNEL_COMMAND` | Optional public tunnel |
| `SEED_DATABASE`, `SEED_BOOTSTRAP_PASSWORD` | Explicit seeding/bootstrap configuration |
| `DB_WAIT_ATTEMPTS` | Startup database wait limit |

Compose reads root `.env` for interpolation and can load the app's API env file. Explicit Compose `environment` entries override its `env_file`. Configure database/JWT values consistently in both places. Bundled PostgreSQL credentials and published database/cache ports are development defaults; restrict ports and set matching private credentials for internet hosting.

## Deployment and operations

Follow [DEPLOY.md](DEPLOY.md). Additional [VM](VBOX_UBUNTU_GUIDE.md) and [domain](STABLE_DOMAIN_GUIDE.md) guides provide context; historical instructions defer to current code/Compose/DEPLOY.md.

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Startup waits for PostgreSQL, applies migrations, optionally seeds only when enabled, and starts API, internal web, and gateway processes. API startup starts SMTP checks and the outbox worker. `start.sh` builds checked-out source without pulling another release or stopping the stack first.

- Gateway liveness: `http://localhost:3001/health`.
- API/email/outbox health: `http://localhost:3000/health`.
- Inspect sanitized SMTP/outbox errors; retry exhausted jobs after fixing the underlying problem.
- Back up PostgreSQL before migrations or destructive operations. Pending email work is stored there.
- PostgreSQL/Redis use named volumes; removing volumes is not a routine upgrade step.
- Configure actual TLS, hostname, origins, support contacts, and sender settings.
- Publishing Git commits/releases does not deploy the VM; preserve its private environment and local edits during deployment.

## Release downloads and artifacts

| Artifact | Location | Contents |
| --- | --- | --- |
| Release | [v1.3.0](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/tag/v1.3.0) | Notes and source assets |
| Production source | [ZIP download](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/download/v1.3.0/bus-aesh-v1.3.0-production.zip) | Full tracked monorepo; requires build |
| Linux/VirtualBox source | [ZIP download](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/download/v1.3.0/bus-aesh-v1.3.0-linux-vbox.zip) | Same full source with platform-oriented name |
| Android QA APK | [Android workflow](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/actions/workflows/build-android-apk.yml) | Successful runs upload `bus-aesh-android-qa-apk`; versioned APK filename |
| Source build evidence | [Release workflow](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/actions/workflows/release.yml) | Build/check logs and `source-release` artifact |
| Local packages | `dist-release/bus-aesh-v1.3.0-*.zip` | Generated and ignored by Git |

Android artifacts require a successful workflow, may require GitHub sign-in, and expire after the configured retention period (currently 30 days). A source release does not establish Android build success. APKs are not included in source ZIPs or automatically attached to the release page.

```bash
# Stage new source files first: packaging reads the tracked file list.
npm run package:release
npm run package:vbox
npm run check:release
```

Packaging includes mobile source, migrations, docs, and scripts; excludes `.env*`, APK/AAB files, compiler caches, logs, and ZIPs. The release check verifies version consistency, required source, and exclusions. These are source packages, not prebuilt servers.

Keep workspace manifests/lockfile, Expo version, Android version name/code, and release notes aligned. `v*` tags trigger workflows. Published tags stay fixed; later README changes on `main` enter a future release archive.

## Verification

Run from repository root:

```bash
npm run build --workspace=packages/shared
npm run build --workspace=apps/api
npm run ts:check --workspace=apps/mobile
npm run check:api-url --workspace=apps/mobile
node apps/web/scripts/check-seat-availability.cjs
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build --workspace=apps/web
```

From `apps/mobile`, run `npx expo install --check`. Offline dependency validation uses cached information and is weaker than an online check. Native Android acceptance includes APK cold launch, logs, and real rider/supervisor journeys. iOS requires macOS/Xcode.

| Evidence from 1.3.0 preparation | Scope |
| --- | --- |
| Shared/API builds, mobile/web types, focused origin/seat checks, web production build | Passed locally |
| Source archives | Local completeness/exclusion checks and GitHub source publication passed |
| Email templates, escaping, retry/recovery | Local SMTP simulation |
| Live development SMTP | OTP and one-way provider acceptance; mailbox not inspected |
| Live failure/restart/access checks | Password-reset failure preserved password/session; outbox resumed; admin retry authorization exercised |
| Local Android release assembly | Blocked before compilation by Windows JDK loopback initialization |
| Tagged Android CI | [1.3.0 Linux build passed](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/actions/runs/38959300221); QA artifact available from the run, not proof of device journeys |
| Round-trip/swap mailbox receipt | Not independently verified |
| Native iOS runtime | Not verified on this Windows workstation |

Use the **CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE** fixture and identified QA records. Bound request volume. Check seat conflicts, repeated scans, positive-fare rejection of `none`, network failures without local tickets, and uncertain POST outcomes before retry. Remove only test-created records; preserve existing rider data and the fixture. Scripts under `scripts/` and `scratch/` may change data; inspect before running.

## Known limits

- Mobile lacks paid checkout, round-trip booking UI, persistent sessions, full admin screens, and verified Arabic localization parity.
- iOS support is shared source/configuration; no verified iOS binary is provided here.
- Android release-variant builds use the development signing key; store distribution requires private production signing.
- Receipt approval is not a card gateway. A stored `refunded` state or UI refund message is not proof of an external money transfer.
- Explicit web offline mode uses demonstration/local data, not live availability.
- PostgreSQL session fallback does not guarantee every Redis-dependent operation survives Redis loss.
- WebSocket delivery is process-local; multi-replica realtime synchronization requires additional work.
- Email enqueueing is idempotent; SMTP delivery remains at least once.
- ERP/provider uptime and current university timetables are external concerns. Optional seed data is not an approved current timetable.
- Live deployment, mailbox receipt, native device QA, and source/build checks are separate acceptance steps.

## Supporting documents and visual assets

| Artifact | Purpose |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Release behavior and verification limits |
| [DEPLOY.md](DEPLOY.md) | Current deployment/packaging guide |
| [Frontend polish record](FRONTEND_POLISH_2026-10-16.md) | Dated mobile/web work and QA context |
| [Audit repair record](AUDIT_REPAIR_2026-10-14.md) | Historical evidence; recheck before current/live claims |
| [DESIGN.md](DESIGN.md) | Existing design reference |
| [WALKTHROUGH.md](WALKTHROUGH.md) | Historical implementation walkthrough |
| [VirtualBox guide](VBOX_UBUNTU_GUIDE.md) | VM context |
| [Stable domain guide](STABLE_DOMAIN_GUIDE.md) | Tunnel/domain context |
| [Command reference](COMMANDS_CHEAT_SHEET.txt) | Historical operational commands |
| [Original brand artwork](Images) | Retained source assets |
| [Web assets](apps/web/public) | Runtime icons, university logos, social image |
| [Mobile assets](apps/mobile/assets) | Expo app/adaptive icons |

The Mermaid diagrams above are architecture/workflow artifacts. These checked-in images are branding artwork, not runtime screenshots or validation evidence.




