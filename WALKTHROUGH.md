# Walkthrough — bus.aesh Web Console

## Getting Started

```bash
# From repo root
npm run dev:web
```

Open **http://localhost:3001** in your browser. The app runs fully offline by default — no database or API needed.

---

## 1. Login (Auth Portal)

You land on `/`. Choose one of these accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| Rider | `aes400196@gu.edu.eg` | `1Key@GALALA` |
| Supervisor | `supervisor@gu.edu.eg` | `super123` |
| Admin | `admin@gu.edu.eg` | `admin123` |

After login you are redirected to the appropriate dashboard.  
You can also switch roles anytime via the **Role Swapping** pills in the sidebar footer or the TopBar role buttons.

---

## 2. Rider — Booking Flow

1. **Select Route** — Choose origin/destination, trip date, and shift (Morning 1, Morning 2, Return).
2. **Pick Trip** — Tap a trip card to see available seats.
3. **Choose Seat** — The seat grid shows a 5-column bus layout. Available seats are light; booked/held seats are dimmed. Tapping a seat locks it for 300 seconds.
4. **Checkout** — Confirm your seat, then pay via Credit Card (mock), InstaPay (upload receipt), or Telda (upload receipt).
5. **View Pass** — After payment, your QR ticket card appears in the **My Tickets** section. Round trips show two QR cards (arrival + return). Tap a card to expand the QR code.
6. **Cancel** — Use the cancel button on a ticket card (only if outside the cancellation lock window).

---

## 3. Supervisor — Scanning & Roster Management

Navigate to `/supervisor` or switch to Supervisor role.

### Boarding Scanner (Camera)
1. Press **Start Camera** — grants camera access and shows a live viewfinder.
2. Point the camera at a QR ticket code — the scanner auto-detects and verifies it.
3. **Valid** → passenger is marked as boarded; audit log entry created.
4. **Invalid / Already boarded / Cancelled** → error message shown.
5. Press **Scan Next** to clear the result and resume scanning immediately (no need to stop/restart camera).

### Boarding Scanner (Manual)
Paste a QR token string into the text field and press **Verify**.

### Passenger Manifest
The manifest table shows all booked passengers on the active trip with:
- Seat number, rider name/email, booking status, boarding state
- **Swap Seat** — reassign a passenger to a different trip/seat
- **Cancel** — remove a passenger booking

### Swap Modal
When you click **Swap Seat**, a modal lets you enter a new Trip ID and Seat Number. The booking is updated and marked as `swapped`.

---

## 4. Admin — Console

Navigate to `/admin` or switch to Admin role.

### Fleet Status
Overview cards for each bus route showing on-schedule/delayed/offline status.

### Live Audit Trail
Sticky-header table of all system events (scans, cancellations, swaps, policy changes). Exportable via CSV (mock).

### Policy Settings
- **Cancellation Lock-out** — slider (1-24 hours). Riders cannot cancel within this window before departure.
- **Wipe Simulation Records** — clears all localStorage bookings and audit logs. Refreshes the page.

---

## 5. Offline Mode

Everything runs from `localStorage`. The status badge in the sidebar and TopBar shows **Offline Simulation** when no API is connected. To test with the real backend:

1. Start Docker services: `docker compose up -d`
2. Run migrations: `npm run db:migrate`
3. Seed data: `npm run db:seed`
4. Start API: `npm run dev:api`
5. The web app auto-detects the API and switches to online mode.

---

## 6. Mobile Access

The app is responsive. On a phone (<768px):
- Sidebar is hidden by default
- Tap the hamburger **☰** icon in the top bar to open the navigation drawer
- Tap the backdrop or the **✕** to close
- Content adjusts to mobile padding automatically

For camera scanning from a phone over LAN:
- Chrome: enable `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
- Add your dev machine IP: `http://192.168.1.X:3001`
- Safari requires HTTPS or use Expo Go app

---

## 7. Architecture Notes

### Component Tree (Web)
```
AppProvider (state context)
├── RootLayout (fonts, meta)
│   ├── AuthPage (/)
│   └── DashboardLayout
│       ├── MobileTopBar (mobile only)
│       ├── SideNavBar (desktop fixed / mobile overlay)
│       ├── TopBar (desktop only)
│       └── [Rider | Supervisor | Admin] page
```

### Key State
- **useAppStore** — centralized context with all app state (auth, booking, scanner, settings)
- **useAuth** — localStorage-backed auth persistence (complementary to store during page reloads)

### Key Libraries
- `jsqr` — real-time QR decoding from camera frames
- `canvas-confetti` — payment success celebration
- `Material Symbols Outlined` — icon system (variable font axis for fill/weight)
