# 🚌 Galala University Smart Transit Platform (Bus Aesh) — v1.1.2

[![Release](https://img.shields.io/badge/Release-v1.1.2-38bdf8?style=for-the-badge&logo=github)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/tag/v1.1.2)
[![Fastify](https://img.shields.io/badge/Fastify-Backend%20API%20(Port%203000)-000000?style=for-the-badge&logo=fastify)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![Next.js 15](https://img.shields.io/badge/Next.js%2015-Web%20Portal%20(Port%203001)-black?style=for-the-badge&logo=next.js)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL%2016-Drizzle%20ORM-336791?style=for-the-badge&logo=postgresql)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![Redis 7](https://img.shields.io/badge/Redis%207-Cache--Aside%20%26%20Locks-dc382d?style=for-the-badge&logo=redis)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time%20Push-4353ff?style=for-the-badge&logo=socketdotio)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Zero%20Trust%20Tunnel-f38020?style=for-the-badge&logo=cloudflare)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![Android APK](https://img.shields.io/badge/Android-APK%20Ready-22c55e?style=for-the-badge&logo=android)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)

**Bus Aesh (منظومة النقل الذكي لجامعة الجلالة)** is an enterprise-grade, high-concurrency transit management, seat reservation, and dispatching ecosystem built specifically for Galala University (GU). It seamlessly connects thousands of students, line supervisors, drivers, and transport administrators into a synchronized real-time operational fabric.

---

## 📑 Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Exhaustive Codebase & Directory Map](#2-exhaustive-codebase--directory-map)
3. [Release v1.1.2 Highlights & Operations Upgrades](#3-release-v112-highlights--operations-upgrades)
4. [Deep Feature Breakdown by Portal](#4-deep-feature-breakdown-by-portal)
   - [Admin Operations Console](#41-admin-operations-console)
   - [Student / Rider Portal](#42-student--rider-portal)
   - [Supervisor On-Board Portal](#43-supervisor-on-board-portal)
   - [Authentication & Identity Service](#44-authentication--identity-service)
5. [Concurrency & Reliability Engineering](#5-concurrency--reliability-engineering)
6. [Future Scaling, Expansion & Integration Roadmap](#6-future-scaling-expansion--integration-roadmap)
7. [Production Deployment & Operations Guide](#7-production-deployment--operations-guide)
8. [Environment Configuration Reference](#8-environment-configuration-reference)
9. [Default Test Credentials](#9-default-test-credentials)

---

## 1. Architectural Overview

The Bus Aesh platform utilizes a high-throughput **npm workspaces monorepo** architecture designed for low latency, zero race conditions, and complete real-time visibility.

```mermaid
graph TD
    subgraph Clients
        Web[Next.js 15 Web Portal<br/>Rider, Supervisor, Admin]
        Mobile[Expo / React Native App<br/>Android Standalone APK]
    end

    subgraph Edge & Security
        CF[Cloudflare Zero Trust Tunnel / Edge SSL]
        STG[Single-Tab & Single-Session Guard]
    end

    subgraph Backend Services
        Fastify[Fastify 4 REST & WebSocket API<br/>Node.js 20 LTS]
        WSHub[WebSocketHub<br/>Trip Rooms & User Sockets]
        CacheSvc[CacheService<br/>Redis Cache-Aside Layer]
        AuditSvc[AuditService<br/>Security Compliance Logger]
        EmailSvc[EmailService<br/>Microsoft 365 / Outlook SMTP]
    end

    subgraph Persistence & State
        PG[(PostgreSQL 16 Database<br/>Drizzle ORM)]
        RD[(Redis 7 In-Memory<br/>Distributed Locks & Cache)]
    end

    Web --> CF
    Mobile --> CF
    CF --> Fastify
    Fastify --> WSHub
    Fastify --> CacheSvc
    Fastify --> AuditSvc
    Fastify --> EmailSvc
    CacheSvc --> RD
    Fastify --> PG
    WSHub -.->|Instant 0ms Push| Web
    WSHub -.->|Instant 0ms Push| Mobile
```

### Key Architectural Tenets:
- **Unified Monorepo**: Shared schemas and cryptographic helpers across backend, web, and mobile prevent contract drift.
- **Cache-Aside Micro-Architecture**: 95%+ of repetitive read queries (schedules, fleet overview, cabin seat maps) are served directly from Redis in **< 2ms**, eliminating PostgreSQL connection saturation.
- **Event-Driven Cache Invalidation**: Any write mutation (trip creation, seat lock, reservation confirmation, cancellation, boarding scan) purges relevant Redis keys instantly and broadcasts a synchronization signal to connected WebSocket clients.
- **Strict Concurrency Safety**: Guaranteed double-booking immunity through a two-phase reservation pipeline (distributed Redis lock `SET NX EX 300` followed by a database transaction with a unique composite index `(trip_id, seat_number)`).
- **Graceful Offline Fallback**: All client components include comprehensive offline simulation stores that activate seamlessly if network connectivity is disrupted.

---

## 2. Exhaustive Codebase & Directory Map

Below is a complete, bit-by-bit map of every file and folder in the repository, explaining its purpose, operational role, and future architectural impact:

```
aesh_gu_bus/
├── .github/
│   └── workflows/
│       ├── build-android-apk.yml     # Automated GitHub Action building standalone Android APKs via EAS
│       ├── build-apk.yml             # Fast matrix build workflow for development APK testing
│       └── release.yml               # Automated release packager creating GitHub Releases and attaching artifacts
│
├── apps/
│   ├── api/                          # Fastify REST & WebSocket API Service
│   │   ├── drizzle/                  # Drizzle ORM SQL migration files
│   │   │   ├── 0000_funny_flatman.sql       # Baseline schema: users, trips, routes, buses, bookings
│   │   │   ├── 0001_cold_moonstone.sql      # Added boarding logs and supervisor relations
│   │   │   ├── 0002_sparkling_misty_knight.sql # Added swap logs and session tracking
│   │   │   ├── 0003_ambitious_ma_gnuci.sql  # Added system settings for cancellation lock rules
│   │   │   ├── 0004_first_screwball.sql     # Added audit logs and security telemetry
│   │   │   ├── 0005_add_boarding_code.sql   # Added human-readable boarding codes (GU-XXXX)
│   │   │   └── meta/                        # Migration state snapshots and journal
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   └── odoo.ts                  # University ERP / Odoo student registry connector
│   │   │   ├── db/
│   │   │   │   ├── index.ts                 # PostgreSQL client connection pool using postgres.js & Drizzle
│   │   │   │   ├── migrate.ts               # Standalone runner for automated database migrations
│   │   │   │   ├── real_schedule_data.ts    # Seed dataset with official 29 Galala routes and stops
│   │   │   │   ├── schema.ts                # Master relational database schema and table definitions
│   │   │   │   └── seed.ts                  # Database seeder populating routes, buses, and admin/supervisor accounts
│   │   │   ├── routes/
│   │   │   │   ├── admin.routes.ts          # Fleet status, shift hub, seat inspector, audit logs, dataset explorer
│   │   │   │   ├── auth.routes.ts           # Student registration, Outlook OTP verification, login, session dispatch
│   │   │   │   ├── bookings.routes.ts       # One-way & round-trip reservations, QR generation, cancellations & refunds
│   │   │   │   ├── supervisor.routes.ts     # QR verification, manual code boarding, seat swaps, supervisor cancellations
│   │   │   │   └── trips.routes.ts          # Public schedule queries, live seat map, Redis seat locking & unlocking
│   │   │   ├── services/
│   │   │   │   ├── audit.service.ts         # Centralized security and compliance event logger
│   │   │   │   ├── cache.service.ts         # Redis Cache-Aside layer with TTL, wildcard pattern invalidation, and WS sync
│   │   │   │   ├── email.service.ts         # High-level dispatcher for OTPs, ticket receipts, and refund alerts
│   │   │   │   ├── mail.service.ts          # Nodemailer transport configured for Microsoft 365 / Outlook SMTP
│   │   │   │   ├── session.service.ts       # Single-device session validation and displacement logic
│   │   │   │   └── sheerid.service.ts       # Academic status verification provider integration
│   │   │   ├── utils/
│   │   │   │   └── trip-time.ts             # Precision departure calculation merging YYYY-MM-DD with time slots
│   │   │   ├── websocket/
│   │   │   │   └── hub.ts                   # WebSocketHub managing trip rooms, user sockets, and broadcast events
│   │   │   ├── index.ts                     # Fastify entrypoint, plugin registration (CORS, JWT, WebSockets), server listen
│   │   │   └── redis.ts                     # Dual-mode IORedis client with in-memory fallback (regex pattern matching, TTL)
│   │   ├── drizzle.config.ts                # Drizzle Kit CLI configuration
│   │   ├── package.json                     # API dependencies, build, and migration scripts
│   │   └── tsconfig.json                    # TypeScript compiler configuration for ES2022 / NodeNext
│   │
│   ├── web/                          # Next.js 15 Web Portal Application
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── page.tsx                 # Unified authentication screen (Login, Register, Outlook OTP, Password Reset)
│   │   │   ├── (dashboard)/
│   │   │   │   ├── admin/
│   │   │   │   │   └── page.tsx             # Master Admin Console hosting Shift Hub, Fleet, Policies, Database
│   │   │   │   ├── rider/
│   │   │   │   │   └── page.tsx             # Student booking dashboard, active ticket passes, round-trip wizard
│   │   │   │   ├── supervisor/
│   │   │   │   │   └── page.tsx             # Supervisor operational dashboard, QR scanner, manifest, seat swaps
│   │   │   │   └── layout.tsx               # Dashboard shell with Single-Tab guard, role switching, responsive sidebar
│   │   │   ├── globals.css                  # Tailwind CSS root styles, animations, custom scrollbars, Cairo font
│   │   │   ├── layout.tsx                   # HTML head, Cairo font import, metadata, and AppProvider wrapping
│   │   │   └── not-found.tsx                # Custom branded 404 error page
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AuditLogTable.tsx        # Searchable, filterable security log table with JSON drawer & CSV export
│   │   │   │   ├── BusSeatInspectorModal.tsx# Interactive 50-seat bus visual inspector (untaken, taken, orange held locks)
│   │   │   │   ├── DatabaseViewer.tsx       # Live dataset explorer for Users, Bookings, Trips, Buses with clean tools
│   │   │   │   ├── FleetStatus.tsx          # Real-time fleet occupancy monitor, route filters, purge & test shift actions
│   │   │   │   ├── PolicySettings.tsx       # System-wide policy controls (cancellation lock hours, max bookings)
│   │   │   │   └── ScheduleManager.tsx      # Interactive shift calendar, card-to-inspector click, clone schedule wizard
│   │   │   ├── auth/
│   │   │   │   ├── ForgotPasswordForm.tsx   # University password reset form with OTP verification
│   │   │   │   ├── LoginForm.tsx            # Email/password authentication form with role resolution
│   │   │   │   ├── RegisterForm.tsx         # Student onboarding form with faculty selector and Outlook OTP trigger
│   │   │   │   └── SingleTabGuard.tsx       # BroadcastChannel guard preventing duplicate browser tabs per user
│   │   │   ├── booking/
│   │   │   │   ├── BookingPassCard.tsx      # Boarding pass ticket card with QR code, GU-XXXX code, and countdown timer
│   │   │   │   ├── CheckoutModal.tsx        # Payment modal supporting Visa mock and Instapay reference entry
│   │   │   │   ├── RouteSelector.tsx        # Route dropdown, direction toggle (to/from campus), date picker
│   │   │   │   ├── SeatGrid.tsx             # Interactive 50-seat cabin selector for students with 5-minute locks
│   │   │   │   ├── SupervisorCancellationModal.tsx # Alert modal notifying student of supervisor cancellations
│   │   │   │   └── TripList.tsx             # List of available shifts for selected route with remaining seat badges
│   │   │   ├── layout/
│   │   │   │   ├── DashboardWrapper.tsx     # Responsive page container with header and role banners
│   │   │   │   ├── DeveloperBar.tsx         # Developer utility bar for role switching and offline mode toggle
│   │   │   │   ├── SideNavBar.tsx           # Desktop and mobile navigation sidebar with quick portal switching
│   │   │   │   └── TopBar.tsx               # Top header bar showing user profile, current time, and logout button
│   │   │   └── supervisor/
│   │   │       ├── ManifestTable.tsx        # Live passenger manifest showing seat numbers, names, and boarding status
│   │   │       ├── QRScanner.tsx            # Camera QR scanner with HTML5 Video, manual code input, audio feedback
│   │   │       ├── SwapModal.tsx            # Modal for reassigning a student to a different seat or trip on the fly
│   │   │       └── TripSelector.tsx         # Supervisor dropdown selector for assigned bus trips
│   │   ├── hooks/
│   │   │   ├── useAppStore.tsx              # Master global React Context managing bookings, trips, auth, and state
│   │   │   └── useAuth.ts                   # Authentication hook handling login, registration, and token persistence
│   │   ├── lib/
│   │   │   ├── api.ts                       # API URL resolver detecting Docker, localhost, and Cloudflare tunnel endpoints
│   │   │   ├── dateUtils.ts                 # Date formatting and operational schedule date generation helpers
│   │   │   ├── offline.ts                   # Comprehensive in-browser simulation store (trips, seats, manifest, logs)
│   │   │   ├── types.ts                     # Full TypeScript interfaces for models, actions, and portal states
│   │   │   └── utils.ts                     # Classnames merger (`clsx`, `twMerge`)
│   │   ├── public/
│   │   │   ├── app-logo.png                 # Branded application emblem
│   │   │   ├── favicon.ico                  # High-resolution website favicon (eliminates browser 404s)
│   │   │   ├── gu-logo-colored.png          # Official Galala University colored emblem
│   │   │   ├── icon.png                     # Standard app icon
│   │   │   └── robots.txt                   # Search engine indexing directives
│   │   ├── next.config.js                   # Next.js configuration enabling standalone output
│   │   ├── package.json                     # Frontend dependencies (React 18, Next 15, Lucide, Canvas-Confetti)
│   │   ├── postcss.config.js                # PostCSS configuration for Tailwind CSS
│   │   ├── tailwind.config.js               # Theme configuration with custom dark colors and typography
│   │   └── tsconfig.json                    # TypeScript configuration for Next.js App Router
│   │
│   └── mobile/                       # React Native / Expo Mobile Application
│       ├── android/                         # Native Android project files for standalone APK builds
│       ├── app/
│       │   ├── _layout.tsx                  # Expo router navigation layout and header configuration
│       │   ├── index.tsx                    # Student mobile portal: route selector, seat booking, ticket passes
│       │   └── scanner.tsx                  # Supervisor mobile screen with BarCodeScanner for camera verification
│       ├── app.json                         # Expo configuration (package name, permissions, splash screen, icons)
│       ├── eas.json                         # Expo Application Services configuration for cloud APK builds
│       ├── metro.config.js                  # Metro bundler configuration with monorepo resolution
│       ├── package.json                     # Mobile dependencies (React Native, Expo, Async-Storage)
│       └── tsconfig.json                    # TypeScript configuration for Expo
│
├── packages/
│   └── shared/                       # Cross-Workspace Shared Module
│       ├── src/
│       │   └── index.ts                     # Zod schemas (CreateBooking, VerifyScan, Swap), QRCodec (HMAC signing)
│       ├── package.json                     # Shared package definition
│       └── tsconfig.json                    # Shared TypeScript configuration
│
├── scripts/
│   ├── clean-test-user.mjs                  # Script for clearing test users and associated bookings
│   ├── docker-entrypoint.sh                 # Unified Docker start script launching Fastify and Next.js concurrently
│   ├── generate-icons.ps1                   # Asset generator producing Android and Web icons from source logos
│   ├── package-release.js                   # Release archiver creating GitHub release packages
│   ├── package-vbox.js                      # Linux VirtualBox package generator creating `bus-aesh-linux-vbox.zip`
│   ├── reset-all-bookings.mjs               # Operational utility for clearing test bookings and resetting seats
│   ├── serve-zip.js                         # Lightweight HTTP server on port 9999 serving release archives
│   └── test-production-features.js          # Automated end-to-end integration test suite
│
├── .dockerignore                            # Directives preventing local dependencies from entering Docker builds
├── .env                                     # Environment variables template for database, Redis, SMTP, and tunnels
├── .gitignore                               # Git ignore directives
├── docker-compose.yml                       # Production Docker Compose stack (app, postgres, redis, cloudflared)
├── Dockerfile                               # Multi-stage production container build for Fastify + Next.js
├── package.json                             # Monorepo root workspace configuration and unified scripts
├── STABLE_DOMAIN_GUIDE.md                   # Complete guide for permanent Cloudflare Zero Trust Named Tunnels
├── start.sh                                 # One-click launch script for Linux Ubuntu / VirtualBox
└── VBOX_UBUNTU_GUIDE.md                     # Step-by-step setup guide for VirtualBox Ubuntu deployment
```

---

## 3. Release v1.1.2 Highlights & Operations Upgrades

Release `v1.1.2` is a major milestone delivering comprehensive operational capabilities, live synchronization parity across all roles, refreshed rider interactions, and zero-downtime container stability:

### 1. 🔁 Both-Way (ذهاب وعودة) Dual-Shift Scheduling & Roster Management
- **Integrated 3-Mode Trip Selector**: The Admin Shift Creation Modal (`ScheduleManager.tsx`) now features a prominent segmented control:
  - 🔁 **ذهاب وعودة (Round Trip / Both Ways)**
  - ➡️ **ذهاب فقط (To Campus)**
  - ⬅️ **عودة فقط (From Campus)**
- **Coordinated Dual-Leg Scheduling**: Selecting "ذهاب وعودة" unlocks a coordinated dual-shift card allowing administrators to pair:
  - **Arrival Leg**: Morning 1 (09:00 AM) or Morning 2 (11:30 AM) with departure time.
  - **Return Leg**: Return 1 (12:30 PM), Return 2 (02:30 PM), or Return 3 (05:30 PM) with departure time.
- **Unified Fleet Binding**: Route, bus, driver, line supervisor, seat count (50), and pricing are seamlessly bound to both legs simultaneously.
- **Atomic Backend Creation (`POST /api/admin/trips`)**: Fastify atomically creates both `to_campus` and `from_campus` trip records within a database transaction, links personnel, records audit events, broadcasts real-time WebSocket signals (`NEW_TRIP_ANNOUNCED`), and purges Redis cache keys in a single operation.

### 2. 📋 Supervisor Live Boarding Synchronization & Manual Check-In
- **One-Click Manual Check-In Button (`تسجيل صعود`)**: Line supervisors can board passengers directly from the live manifest table with a single tap, eliminating dependency on camera scanning during low-light or damaged screen situations.
- **Instant Optimistic UI & Acoustic Feedback**: Tapping check-in immediately switches the student's status pill to green (`تم الصعود`), triggers an acoustic confirmation chime, and increments the live boarded counter.
- **Anti-Desynchronization Fix**: Fixed defect where boarding all students left the summary counter showing zero boarded. Counters now accurately compute live counts from manifest rows and broadcast updates across all connected admin and supervisor sessions.
- **Auto-Refreshing Manifest**: Manifest table regularly syncs with the backend to ensure immediate visibility of newly boarded passengers or last-minute ticket transfers.

### 3. 🔄 Rider UI Refresh & Real-Time Controls
- **On-Demand "تحديث الرحلات" (Refresh) Button**: Added a dedicated refresh button with a spinning animation in the Rider booking dashboard (`/rider`), allowing students to query the latest available shifts instantly without performing a full browser reload.
- **Polished Shift & Route Cards**: Completely redesigned shift cards featuring high-contrast route badges, departure/arrival timeline indicators, real-time remaining seat pills, and responsive layout for mobile and desktop screens.
- **SeatGrid Real-Time Lock Timers**: Enhanced 50-seat cabin visualizer with clear countdown indicators for active holds and immediate Redis lock release on seat deselection.

### 4. 🛡️ Supervisor Cancellation Notification Isolation
- **Targeted Student Push Alerts**: Corrected WebSocket event routing so that when a supervisor cancels a passenger's booking (due to emergency or bus re-routing), the notification modal triggers **only** for the affected student, completely preventing self-notification loops for the supervisor.

### 5. 📄 Redesigned & Organized PDF Manifests
- **Structured Tabular Layout**: Overhauled PDF exports for drivers and supervisors into a publication-ready tabular layout with university branding, route summary, departure timestamp, plate number, driver details, and student manifest.
- **Arabic Typography & Styling**: Formatted with RTL Arabic support, clear grid borders, and distinct status columns (`رقم المقعد`, `اسم الطالب`, `الرقم الجامعي`, `كود الصعود`, `حالة الصعود`).

### 6. ⚡ Guaranteed 0-Downtime Container Boot (Cloudflare 502 Elimination)
- **Safe UUID Query Execution**: Resolved critical Postgres `22P02 invalid input syntax for type uuid: "user-default-id"` in `apps/api/src/db/seed.ts` by removing legacy non-UUID delete statements.
- **Guaranteed Process Termination**: Added `process.exit(0)` to both success and catch blocks in `seed.ts`, ensuring the entrypoint script (`docker-entrypoint.sh`) never hangs and immediately launches Fastify (`:3000`), Next.js (`:3002`), and the Gateway reverse proxy (`:3001`).

### 7. 🏎️ Foundational High-Concurrency Performance (from v1.1.1)
- **Redis Cache-Aside Layer**: Sub-2ms responses for `/api/admin/schedules`, `/api/admin/fleet`, and public seat maps.
- **Event-Driven Cache Invalidation**: Instant Redis cache purges upon every mutation paired with 0ms WebSocket broadcast pushes.
- **Throttled Polling & Visibility Guards**: Network polling backed off to 20s–25s and completely halted when browser tabs are hidden (`document.visibilityState === 'hidden'`).
- **Single-Tab & Single-Device Protection**: Native `BroadcastChannel` prevents multi-tab race conditions and enforces single-device logins.

---

## 4. Deep Feature Breakdown by Portal

### 4.1. Admin Operations Console
Accessed at `/admin` (or via the role selector bar in development).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ADMIN OPERATIONS CONSOLE                                │
├──────────────────────┬──────────────────────┬────────────────────┬─────────────────────┤
│ Shift & Schedule Hub │   Fleet Live Status  │  Policies & Logs   │  Dataset Explorer   │
└──────────────────────┴──────────────────────┴────────────────────┴─────────────────────┘
```

1. **Shift & Schedule Hub (`ScheduleManager.tsx`)**:
   - **Both-Way (ذهاب وعودة) Creation**: 3-option trip type selector (`ذهاب وعودة`, `ذهاب فقط`, `عودة فقط`) allowing administrators to atomically schedule coordinated arrival and return shifts with shared fleet assets in a single click.
   - Filter trips by **Date** (today, tomorrow, next 10 days), **Route**, and **Shift** (Arrival 1, Arrival 2, Return 1, Return 2, Return 3).
   - Real-time statistics bar: Total Shifts, Total Fleet Capacity, Confirmed Bookings, and Active Drivers.
   - **Click-to-Inspect**: Clicking any shift card launches the **Bus Seat Map Inspector Modal**.
   - **Clone Schedule Wizard**: Duplicates all scheduled shifts and supervisor assignments from a source date to a target date with a single click.
   - **Shift Purge & Synchronized Parity**: Clears obsolete shifts simultaneously in PostgreSQL and Redis cache with zero orphan ghost trips.

2. **Bus Seat Map Inspector Modal (`BusSeatInspectorModal.tsx`)**:
   - Visual 50-seat bus cabin layout featuring the driver's cabin, central aisle, and back row.
   - Three interactive seat states:
     - **Untaken (Free)**: Slate-colored seat. Clicking renders a notification banner: `"This seat is untaken / هذا المقعد شاغر"`.
     - **Taken (Booked)**: Bold blue seat with passenger icon. Clicking opens a comprehensive passenger information panel showing **Student Full Name (Arabic & English), Academic ID, Email, Phone Number, Faculty/Program, Boarding Status, Booking Code, and Purchase Timestamp**.
     - **In-Progress Lock (Held - Orange)**: Amber-colored pulsating seat. Clicking reveals the student currently holding the lock, their faculty, and the remaining lock countdown in seconds.
   - Live counter pills: All Seats (50), Taken (Count), In-Progress (Count), Untaken (Count).

3. **Fleet Live Status (`FleetStatus.tsx`)**:
   - Real-time fleet overview showing every active bus, assigned driver, line supervisor, route name, and live occupancy percentage.
   - Multi-criteria filtering: Route, Direction, Shift Time, Occupancy Status (`Scheduled`, `Boarding`, `Filling Fast`, `Full`), and Search Query (driver name, plate number, route).
   - Quick-action buttons: Purge Shifts, Create Test Shift, Refresh Fleet.

4. **Database & Dataset Explorer (`DatabaseViewer.tsx`)**:
   - Dedicated administrative viewer for inspecting raw relational records across:
     - **Users**: Search by name, email, academic ID, phone, or filter by role (`student`, `supervisor`, `admin`).
     - **Bookings**: Inspect all confirmed, swapped, and cancelled bookings with payment reference and boarding status.
     - **Trips**: View operational trips, departure times, assigned buses, and pricing.
     - **Buses**: Inspect fleet inventory, plate numbers, and seating capacities.
   - Includes a **"Clean Test Student"** button to purge test accounts (`aes400196@gu.edu.eg`) and reset test states with one click.

5. **Policies & Security Logs (`PolicySettings.tsx` & `AuditLogTable.tsx`)**:
   - System policy controls: configure the **Cancellation Lock Period** (default: 3 hours for students, 5 hours for supervisors).
   - Comprehensive audit table logging every authentication attempt, OTP generation, seat lock, reservation, boarding scan, swap, and administrative action with client IP addresses, timestamps, and JSON metadata.
   - Real-time search, action filter pills, and working **CSV Export**.

---

### 4.2. Student / Rider Portal
Accessed at `/rider`.

1. **Route & Shift Selection (`RouteSelector.tsx`, `TripList.tsx`)**:
   - **On-Demand "تحديث الرحلات" Button**: Dedicated refresh button with spinning state for instant live bus availability sync.
   - **Redesigned Shift Cards**: High-contrast route badges, departure/arrival timelines, and remaining seat counters.
   - Selection of 29 official Galala University routes (Port Tawfik, Suez, El Salam, El Obour, October, Nasr City, New Cairo, etc.).
   - Direction toggle: **To Campus (ذهاب إلى الجامعة)** or **From Campus (عودة من الجامعة)**.
   - Operational date picker and shift selector (Morning 07:00 AM, Return 12:30 PM, Return 02:30 PM, Return 05:30 PM).
   - Booking mode toggle: **One-Way (ذهاب فقط)** or **Round-Trip (ذهاب وعودة)**.

2. **Interactive 50-Seat Cabin Selector (`SeatGrid.tsx`)**:
   - Realistic 2x2 cabin layout with driver indicator, central aisle, and 5-seat back row.
   - Clicking an available seat initiates a **5-minute temporary lock** in Redis (`SET seat_lock:tripId:seatNum userId NX EX 300`).
   - The selected seat turns orange and begins a live countdown timer. Across all other connected devices, the seat turns gray/held in **0ms** via WebSockets.
   - Deselecting the seat releases the lock immediately (`POST /api/trips/:id/seats/:num/unlock`).

3. **Concurrency-Safe Checkout (`CheckoutModal.tsx`)**:
   - Supports **Visa Mock** and **Instapay Reference** payment methods with formatted card inputs and visual validation.
   - Completing payment creates confirmed booking records in PostgreSQL, clears the Redis lock, and delivers instant confirmation.
   - Celebratory confetti animation upon successful reservation.

4. **Active Boarding Passes (`BookingPassCard.tsx`)**:
   - Displays confirmed tickets with destination, departure date, departure time, seat number, and bus details.
   - Dual Verification:
     - **High-Resolution QR Code**: Cryptographically signed HMAC token containing booking ID, trip ID, seat number, and date.
     - **Prominent Boarding Code (`GU-XXXX`)**: 4-character alphanumeric code for rapid manual verification when lighting or camera scanning is impaired.
   - Live Countdown: Displays hours and minutes remaining until departure.
   - Self-Service Cancellation: Students can cancel bookings prior to the cancellation lock window (default: 3 hours) with automatic refund processing.

---

### 4.3. Supervisor On-Board Portal
Accessed at `/supervisor`.

1. **One-Click Manual Check-In & Boarding Counters (`ManifestTable.tsx`)**:
   - Interactive **"تسجيل صعود" (Board Passenger)** button on each manifest row for instant boarding without camera scanning.
   - Live boarded summary counter accurately computes total, boarded, and pending passenger counts with instant optimistic updates and confirmation sound.

2. **Live Camera QR Scanner (`QRScanner.tsx`)**:
   - Utilizes `jsQR` and HTML5 Video to scan student boarding passes directly through the device camera.
   - **Anti-Passback Fraud Prevention**: Verifies that the ticket belongs to the current trip and has not been previously scanned. If a ticket was already used, it immediately alerts the supervisor with the exact timestamp it was scanned.
   - Instant visual and acoustic feedback (success chime on valid ticket, warning sound on duplicate/invalid ticket).
   - **Manual Code Input**: Allows the supervisor to enter the student's 4-character code (`GU-XXXX`) to verify boarding without a camera.

3. **Real-Time Passenger Manifest & PDF Export (`ManifestTable.tsx`)**:
   - Complete manifest of all confirmed passengers for the assigned trip with live search by name, academic ID, or code.
   - **Organized PDF Export**: High-quality formatted passenger manifest PDF printout for drivers and university administration.

4. **On-the-Fly Seat Reassignment (`SwapModal.tsx`)**:
   - Allows supervisors to reassign a student to an alternative empty seat on the same trip or transfer them to another bus.
   - Automatically issues a new signed QR code and sends an instant email notification to the student with their updated seat details.
   - Logs the swap event in the audit trail.

5. **Supervisor Cancellation with Automated Refund**:
   - Supervisors can cancel a passenger's booking up to 5 hours prior to departure (e.g. for operational bus re-routing).
   - Isolated notification routing ensures the alert is dispatched only to the affected student, without triggering self-alerts for the supervisor.
   - Automatically marks the booking as cancelled, initiates a 100% full refund (160 EGP), frees the seat in the live cabin map, and sends an instant push alert and email to the student.

---

### 4.4. Authentication & Identity Service
Accessed at `/` (Home).

1. **Official University Email Verification (`@gu.edu.eg`)**:
   - Registration requires a valid Galala University student email (`name@gu.edu.eg`).
   - Generates a secure 6-digit OTP dispatched via Microsoft 365 / Outlook SMTP servers (`smtp.office365.com`).
   - Includes a direct one-click button opening the student's webmail inbox (`https://outlook.office.com/mail/`).

2. **Single-Tab Browser Guard (`SingleTabGuard.tsx`)**:
   - Uses the browser's native `BroadcastChannel` API (`aesh_tab_channel`) to ensure each user can only have one active portal tab open.
   - Opening a second tab immediately pauses execution and displays a dual-language warning screen (`Multiple Tabs Detected • تم اكتشاف نوافذ متعددة`), preventing race conditions and accidental double reservations.

3. **Single-Device Session Enforcement (`session.service.ts`)**:
   - When a user logs in from a new device, any existing active sessions on other devices are displaced via WebSocket signal (`SESSION_TERMINATED`) and disconnected.

---

## 5. Concurrency & Reliability Engineering

The Bus Aesh platform enforces bulletproof concurrency control through a multi-tiered architecture:

```
[ Student Clicks Seat ]
         │
         ▼
[ Fastify API: /api/trips/:id/seats/:num/lock ]
         │
         ▼
[ Redis: SET seat_lock:trip:seat userId NX EX 300 ]
   ├── Key Exists? ──► [ 409 Conflict: Seat Held by Another Student ]
   └── Acquired?   ──► [ 200 OK + Broadcast 'seat_locked' via WebSocketHub ]
                             │
                             ▼
              [ Other Clients Gray Out Seat in 0ms ]
                             │
                             ▼
              [ Student Completes Checkout in Modal ]
                             │
                             ▼
              [ PostgreSQL: BEGIN TRANSACTION ]
              [ Check Unique Constraint (trip_id, seat_number) ]
              [ INSERT INTO bookings (...) ]
              [ COMMIT TRANSACTION ]
                             │
                             ▼
              [ Redis: DEL seat_lock:trip:seat ]
              [ CacheService: Invalidate Seat & Fleet Caches ]
              [ Broadcast 'seat_booked' via WebSocketHub ]
```

### 1. Two-Phase Reservation Protocol
1. **Phase 1 (Temporary Lock)**: The seat is locked in Redis for 300 seconds (5 minutes) using atomic `NX` (not-exists) semantics. If another student attempts to select the same seat simultaneously, Redis rejects the operation in < 1ms.
2. **Phase 2 (Permanent Record)**: During checkout, PostgreSQL inserts the booking within a serializable transaction. The table enforces a composite unique index:
   ```sql
   CONSTRAINT unique_trip_seat_confirmed UNIQUE (trip_id, seat_number)
   ```
   Even in the extreme event of a distributed lock timeout, the database strictly prevents duplicate seat assignments.

### 2. Micro-Caching with Zero Stale Data
- API read queries check Redis first (`cache:*`).
- All mutation handlers call `CacheService.invalidateTripsAndFleetCache()` or `CacheService.invalidateSeatCache()`.
- Data modifications are visible to all clients within milliseconds without polling the database.

---

## 6. Future Scaling, Expansion & Integration Roadmap

The Bus Aesh platform is architected with clear expansion pathways for enterprise university scale:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FUTURE SCALING & ROADMAP MATRIX                       │
├──────────────────────┬──────────────────────────────────────────────────────┤
│ Horizon 1 (Near-Term)│ • PgBouncer connection pooling for 10,000+ conn.     │
│                      │ • GPS IoT hardware tracking on live interactive maps │
│                      │ • Mobile Push Notifications via Firebase / APNs      │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ Horizon 2 (Mid-Term) │ • Multi-Campus support (Galala, New Cairo, Suez)     │
│                      │ • Bi-directional Odoo ERP webhook synchronization    │
│                      │ • NFC Student ID Card tap verification on buses      │
├──────────────────────┼──────────────────────────────────────────────────────┤
│ Horizon 3 (Long-Term)│ • Dynamic route demand forecasting via AI / ML       │
│                      │ • Automated driver shift scheduling & fleet dispatch │
│                      │ • Multi-university tenancy across Egypt              │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

1. **High-Throughput Database Scaling (PgBouncer & Read Replicas)**:
   - Introduce **PgBouncer** in transaction pooling mode between Fastify and PostgreSQL to scale up to 10,000+ simultaneous connections during morning registration surges.
   - Separate PostgreSQL read replicas for administrative analytics and audit log queries.

2. **Live Bus GPS Tracking & Fleet Telematics**:
   - Integrate onboard IoT GPS hardware (Teltonika / Queclink) streaming coordinates via MQTT / WebSockets.
   - Display live bus location markers, estimated time of arrival (ETA), and traffic delays on a Leaflet / Mapbox map in the student app.

3. **NFC Student Card Physical Tap Validation**:
   - Enable NFC chip reading on supervisor Android devices so students can tap their physical university ID cards against the phone in addition to scanning QR codes.

4. **Deep University ERP / SIS Integration**:
   - Connect webhooks directly with Galala University's SIS (Student Information System) and Odoo ERP to automatically validate enrollment status, tuition payment clearance, and housing residency before allowing seat bookings.

---

## 7. Production Deployment & Operations Guide

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- Git
- 2 GB RAM minimum (4 GB recommended)

### Quick Start Deployment (Linux Ubuntu / VirtualBox)

```bash
# 1. Clone the repository
git clone https://github.com/AbdelrahmanHussein1/aesh_gu_bus.git
cd aesh_gu_bus

# 2. Configure environment variables (optional, defaults provided)
cp .env.example .env 2>/dev/null || true

# 3. Build the unified application container
docker compose build app

# 4. Launch all services (Fastify API, Next.js Web, PostgreSQL, Redis, Cloudflared)
docker compose up -d

# 5. Retrieve your public Cloudflare Tunnel URL
docker compose logs cloudflared | grep -o 'https://.*\.trycloudflare\.com' | tail -n 1
```

### Port Allocations:
- **`3001`**: Next.js 15 Web Portal (`http://localhost:3001`)
- **`3000`**: Fastify Backend REST & WebSocket API (`http://localhost:3000`)
- **`5432`**: PostgreSQL 16 Database
- **`6379`**: Redis 7 Cache & Lock Store
- **`9999`**: Local HTTP Release Zip Server (`scripts/serve-zip.js`)

### Daily Operational Commands

```bash
# View live container status
docker compose ps

# View API logs
docker compose logs -f app

# Run database migrations manually
npm run db:migrate --workspace=@bus-aesh/api

# Run database seeder
npm run db:seed --workspace=@bus-aesh/api

# Package Linux VirtualBox release archive
node scripts/package-vbox.js
```

---

## 8. Environment Configuration Reference

The application is configured through environment variables defined in `.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Fastify API server listening port |
| `HOST` | `0.0.0.0` | Server host binding |
| `DATABASE_URL` | `postgres://aesh_user:aesh_password@postgres:5432/aesh_db` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `JWT_SECRET` | `super-secret-production-aesh-jwt-key` | Secret key for JWT signing and QR HMAC encryption |
| `NEXT_PUBLIC_API_URL`| `http://localhost:3000` | Backend API base URL accessible by web clients |
| `CLOUDFLARE_TUNNEL_TOKEN` | *(optional)* | Named Tunnel token from Cloudflare Zero Trust dashboard |
| `SMTP_HOST` | `smtp.office365.com` | University Microsoft 365 / Outlook SMTP host |
| `SMTP_PORT` | `587` | SMTP port (STARTTLS) |
| `SMTP_USER` | `transport@gu.edu.eg` | University email sending account |
| `SMTP_PASS` | `app_password_here` | Outlook App Password |

---

## 9. Default Test Credentials

For rapid evaluation and demonstration, the database includes pre-configured accounts:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@gu.edu.eg` | `1111` *(or `123456`)* | Master operations, fleet live status, shift hub, audit logs, dataset explorer |
| **Line Supervisor** | `supervisor@gu.edu.eg` | `1111` *(or `123456`)* | Live camera QR scanning, manual code boarding, passenger manifest, seat swaps |
| **Student / Rider** | `student@gu.edu.eg` | `1111` *(or `123456`)* | Route selection, 50-seat cabin selector, seat locking, payments, boarding passes |

*(Students can also register new accounts directly using their `@gu.edu.eg` university email address).*

---

## 📄 License & Attribution

Developed for **Galala University (جامعة الجلالة)** Smart Transit Management.  
All Rights Reserved © 2026. Built with precision, performance, and concurrency safety.
