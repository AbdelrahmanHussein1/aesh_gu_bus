# `bus.aesh` Platform Run & Architecture Guide

`bus.aesh` is a premium university bus booking console and management system engineered for Galala University students and bus supervisors. It features real-time seat locks, dual-shift morning routes, paired round-trip bookings with automatic same-seat allocations, leg-specific single-use QR codes, and a cross-platform mobile scanner.

---

## 🏗️ Project Architecture & Tech Stack

This project is organized as an **npm workspaces monorepo**:

* **`/packages/shared`**: Reusable validation schemas (Zod) and QR token encoding/decoding modules (`QRCodec`).
* **`/apps/api`**: Fastify backend API managing JWT auth, Postgres database transactions, Redis-based distributed seat locks, and WebSockets.
* **`/apps/web`**: High-fidelity Next.js web application utilizing Tailwind CSS/vanilla CSS styles with dynamic dark-mode aesthetics. Supports Rider, Supervisor, and Administrator roles.
* **`/apps/mobile`**: Cross-platform Expo/React Native mobile application equipping supervisors with a physical camera scanner.

### Technologies
* **Runtime**: Node.js & TypeScript
* **Database**: PostgreSQL (via Drizzle ORM)
* **Caching/Syncing**: Redis
* **Frameworks**: Fastify (API), Next.js (Web), Expo (Mobile App)

### Web App Design System
The web console at `apps/web` was redesigned with a premium light-theme interface using:
- **Typography**: Outfit (headings/body) + JetBrains Mono (mono/metadata)
- **Icons**: Material Symbols Outlined (variable font axis)
- **Color**: Canvas-based palette with `#14259B` primary, `#F8FAFC` background
- **Components**: 20+ custom React components organized by feature (auth, booking, layout, supervisor, admin)
- **Offline Engine**: Complete local simulation via localStorage with mock users, trips, and seat management

---

## ⚙️ Requirements & Environment Setup

Before starting, ensure you have the following installed on your system:
1. **Node.js** (v18.x or v20.x recommended)
2. **Docker Desktop** (for running Postgres & Redis)
3. **Expo Go** (app installed on your phone if testing the mobile scanner)

### Local Configuration
Configuration values are loaded from environment files. The API backend configuration is located in `apps/api/.env`:

```env
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgres://aesh_user:aesh_password@localhost:5432/aesh_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-aesh-key
RESEND_API_KEY=re_mock_key
MOCK_ERP=true
```

---

## 🚀 Step-by-Step Installation & Run Guide

Run all of the following commands from the **root** folder of the repository.

### 1. Install Dependencies
Initialize and install workspace dependencies:
```bash
npm run install:all
```

### 2. Start Services (Postgres & Redis)
Spin up the PostgreSQL and Redis containers configured in the `docker-compose.yml` file:
```bash
docker compose up -d
```

### 3. Generate & Apply DB Migrations
Compile the shared packages and push database schema migrations to the Postgres database:
```bash
# Build the shared schemas package first
npm run build --workspace=packages/shared

# Run migration to create schema tables
npm run db:migrate
```

### 4. Seed Database
Seed the database with default university accounts (Admin, Supervisor) and trips split across all shifts:
```bash
npm run db:seed
```

### 5. Launch the Applications

You can start the different applications using the scripts in the root `package.json`:

#### A. Start the API Backend
Runs the Fastify server on port `3000`:
```bash
npm run dev:api
```

#### B. Start the Web Console
Runs the Next.js web dashboard on port `3001` (or next free port):
```bash
npm run dev:web
```

#### C. Start the Mobile Scanner App
Starts the Expo development bundle. Scan the QR code displayed in your terminal using the **Expo Go** app on your phone:
```bash
npm run dev:mobile
```

---

## 🛡️ Core System Features & Logic

### 1. Tri-Shift Schedule & Pricing
* **Shift 1 (05:00 - 10:00)**: Arrival leg bound to university campus.
* **Shift 2 (10:00 - 11:30)**: Late morning arrival leg to campus.
* **Return (12:00 - 17:10)**: Return leg bound from university to cities.
* **Flat Price**: All trips cost exactly **160 EGP** regardless of booking direction.

### 2. Round-Trip Same-Seat Allocation
* Round-trip bookings automatically allocate the **same seat number** on both the arrival leg and return leg.
* The seat selection map fetches seat states from **both** active trips. A seat is shown as occupied if it is booked or held on either of the two legs.
* Booking a round-trip locks the seat on both legs inside a database transaction, ensuring no double-bookings occur on either trip.

### 3. Dual QR Code System & Expiration
* Round-trip checkouts issue **two distinct, leg-specific QR codes** immediately.
* QR tokens contain the `legType` identifier:
  * `0` = University Only (`to_campus`)
  * `1` = Return Only (`from_campus`)
* **Single-Use**: Tickets expire immediately after being successfully scanned on board.
* **24h Expiration**: Tickets expire and become invalid 24 hours after creation if they are unused.

### 4. Offline Simulation Fallback Engine
If the Fastify backend is not running or unreachable:
* The web console and mobile scanner gracefully fail-over to an **Offline Simulation Engine**.
* Credentials and bookings are saved locally to `localStorage` (or memory on mobile).
* Live seats are simulated, allowing you to test seat locks, checkout validations, and scans in a zero-network environment.

### 5. Web App Route Structure (Next.js App Router)
The web console uses route groups to separate auth and dashboard views:

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | Auth Portal | Login / Register / Forgot Password (auto-redirects if authenticated) |
| `/rider` | Rider Dashboard | Book trips, select seats, checkout, view QR passes |
| `/supervisor` | Supervisor Panel | Passenger manifest, QR scanner (camera + manual), seat swaps |
| `/admin` | Admin Console | Fleet status, audit log, policy settings |

### 6. Sidebar Navigation & Mobile Responsiveness
- **Desktop**: Fixed sidebar (collapsible via chevron, `w-64` / `w-16` icon-only mode)
- **Mobile**: Overlay drawer triggered by hamburger menu, backdrop dismiss
- **TopBar**: Desktop shows role switcher + status badge; mobile shows compact header with menu toggle

---

## 📱 Mobile Scanner & Local Wi-Fi Testing (Insecure Origins)

Modern mobile browsers restrict camera access (`getUserMedia`) to secure origins (**HTTPS** or **localhost**). If you are accessing the web console or mobile scanner over local Wi-Fi (`http://192.168.1.X:3001`), the browser will block camera authorization.

### How to Bypass Browser Blocks on Phone:
1. **Google Chrome**:
   * Open Chrome on your mobile device.
   * Go to URL: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
   * Add your computer's local IP and port (e.g. `http://192.168.1.9:3001` and `http://192.168.1.9:3000`).
   * Toggle to **Enabled** and relaunch Chrome.
2. **Safari (iOS)**:
   * Settings -> Safari -> Advanced -> Experimental Features -> Enable `MediaRecorder` or trust local IP hosts. (Alternatively, test using the Expo Go mobile app wrapper which does not restrict HTTP camera permissions).

---

## 🔑 Quick Demo Accounts

When testing, use these default accounts for auto-login:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Rider (Student)** | `aes400196@gu.edu.eg` | `1Key@GALALA` | Books seats and views scannable QRs. |
| **Supervisor** | `supervisor@gu.edu.eg` | `super123` | Scans passengers and manages rosters. |
| **Admin** | `admin@gu.edu.eg` | `admin123` | Configures lock policies and wipes databases. |
