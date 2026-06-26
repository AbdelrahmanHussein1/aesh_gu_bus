# Project Brief: Galala University Bus Booking System — Full Rebuild

## 0. Context and Mandate

You are rebuilding the university bus booking system used at Galala University from scratch. The legacy system lives inside the university ERP at `https://erp.gu.edu.eg/my`. You will be given credentials with access to that ERP.

**Forsake the legacy system's design entirely.** Do not replicate its UI, its UX flows, its code structure, or its architecture in any way. The only thing you are allowed to carry over is the underlying *data*: routes, bus lines, schedules, stops/pickup points, existing bookings, student/faculty identities, and any historical records needed for continuity. Everything else — interface, database schema, booking logic, notification system, roles, infrastructure — is being designed fresh by you.

Before writing a single line of implementation code, you must investigate the live ERP system end-to-end and report back what you find. Do not assume the data model — extract it.

---

## 1. Phase 0 — Discovery (mandatory, do this first)

Using the provided credentials, log into `https://erp.gu.edu.eg/my` and locate the bus booking module. Investigate and document, in a written report before any build work:

1. **Data model**: every entity involved — bus routes, stops, schedules, bus vehicles, capacity per bus, student/faculty profile fields, existing reservation records, any waitlist data, any historical trip logs.
2. **Identity fields**: what uniquely identifies a student or faculty member in their system (student ID, national ID, university email format, faculty ID format) — this matters because our QR codes and check-in logs need a stable, unique identifier.
3. **Roles that exist today**: is there already a concept of "supervisor" or "driver" in the old system? What can they currently do?
4. **Authentication mechanism**: how does the ERP log a user in? Is there a session cookie, a CSRF token flow, an API endpoint you can call directly, or is it server-rendered HTML-form-only with no API? Determine whether direct API calls are feasible or whether you'll need a server-side login proxy (submitting credentials to their login form from our backend and holding the resulting session). Report which approach is viable and why.
5. **Rate limits / fragility**: does the ERP show signs of being fragile under repeated automated requests (this matters because we need a one-time data migration, not an ongoing dependency)?
6. **Export plan**: propose a one-time (or periodically re-syncable) data extraction plan — e.g., scripted scrape of routes/schedules/rosters into clean JSON/CSV — that gets us everything we need without building a permanent live dependency on the old ERP's fragile internals, except for the one thing we must keep live: login identity verification (see Section 2).

Do not proceed to building until this discovery report is written and I've reviewed it. Flag anything ambiguous or anything you could not access, rather than guessing.

---

## 2. Authentication — Decision Locked

Students and faculty must continue to log into the new system using their existing Galala University ERP credentials (university email + ERP password). There is no separate signup flow.

Since the ERP almost certainly does not expose a public OAuth/SSO endpoint for third-party apps, implement this as follows, in order of preference based on what Phase 0 discovers:

1. **Preferred**: if the ERP has any identifiable internal API (even undocumented) for login, integrate directly against it server-side, never exposing it to the frontend.
2. **Fallback**: implement a server-side credential proxy: our backend receives the user's email/password over HTTPS, submits it to the ERP's login form server-side, confirms success via the resulting session/redirect, extracts the authenticated profile data needed (name, ID, role, faculty/student distinction), then **immediately discards the raw password** — never store it, never log it. Issue our own signed session token (JWT or equivalent) for all subsequent interaction with our system.
3. Whichever method is used, our system never persists the ERP password anywhere — not in logs, not in the database, not in plaintext, not even encrypted. It is used once per login attempt and discarded from memory immediately after.
4. Add basic resilience: if the ERP login endpoint is slow or temporarily down, our login should fail gracefully with a clear "university login service unavailable, try again shortly" message — never a generic crash — and should not hammer the ERP with retries that could get our system IP blocked.
5. Faculty and students authenticate through the same flow; role (student vs faculty) is read from the ERP profile data and used for downstream permissions (e.g., faculty may have different route eligibility).

Bus drivers and bus supervisors are **not** existing ERP roles — see Section 4 for how their accounts are created and managed.

---

## 3. Core Differentiating Features (the actual point of this rebuild)

These are the features that don't exist in the old system and are the reason for this rebuild. Treat them as first-class, not bolted on.

### 3.1 Unique scannable QR code per booking
- The moment a booking is confirmed, the system generates a **unique QR code tied to that specific booking** (not just the person — a person who books two different trips gets two different QR codes, since each is tied to a specific bus, date, and route).
- The QR code encodes a signed token (not raw readable data) containing at minimum: booking ID, rider identity ID, bus/route ID, scheduled date and time. Signed so it can't be forged or edited client-side (e.g., HMAC-signed JWT or equivalent).
- The QR code is embedded in the confirmation email sent to the rider (see 3.2), and also viewable inside the rider's own app/web session (in case they don't have email access, e.g., offline mobile view).
- Scanning the QR code is how attendance is captured — see 3.3.

### 3.2 Confirmation email
- Sent immediately upon booking confirmation, to the university email address (from ERP profile data — do not let users type in an arbitrary email).
- Contains: rider name, route, bus number/identifier, date, departure time, pickup point, the QR code image (embedded inline, not just a link, since email image-loading varies), and a short explanation that this code will be scanned at boarding.
- Also send: a cancellation confirmation email if cancelled, and a swap notification email if the supervisor/admin moves them to a different bus (showing the old and new bus/route/time, and a freshly regenerated QR code since the route/bus context has changed).
- Must work for both students and faculty — same email mechanism, just pulled from their respective ERP profile email fields.

### 3.3 QR scanning for attendance (driver + supervisor access)
- Both the **bus driver** and the **bus supervisor** must be able to scan riders' QR codes as they board (using a phone camera via a web-based scanner — no native app required, this should run in a mobile browser).
- Scanning a valid QR code:
  - Verifies the signature (rejects tampered/expired codes).
  - Confirms the booking is for *this* bus and *today's* scheduled trip (reject if someone tries to board the wrong bus — this should surface a clear "wrong bus" warning, not a silent failure).
  - Records a timestamped attendance entry: who boarded, which bus, what time, scanned by whom (driver or supervisor identity).
  - Updates a live roster view in real time (see 3.5) so the supervisor can see who's boarded vs who's still expected.
- Duplicate scans (same code scanned twice) should be handled gracefully — show "already checked in at [time]" rather than creating duplicate records or throwing an error.
- The system must store, per trip, a complete boarding log: name, scan timestamp, scanning device/role. This is the core record the supervisor uses to know exactly who is physically on the bus.

### 3.4 Cancellation policy
- Riders can cancel their own booking, but **cancellation is locked starting X hours before scheduled departure** (X is a configurable system setting, not hardcoded — give admins a settings panel to adjust this per-route or globally; default suggestion: 3 hours, but make it adjustable).
- Once inside the lock window, the cancel button is disabled in the UI with a clear explanation of why (showing the exact cutoff time), not just a disabled greyed-out control with no context.
- Cancelling before the lock window immediately frees the seat for others (waitlist or new bookings), and triggers the cancellation confirmation email.
- All cancellations are logged with timestamp and reason (optional free-text reason field) for audit/reporting purposes.

### 3.5 Swap / reassignment (supervisor + admin only)
- Only **bus supervisors** and **admins** can move a rider from one bus/trip to another — not the rider themselves, not drivers.
- This is necessary for cases like: bus breaks down, overbooking correction, a rider has a legitimate last-minute need to switch routes, load balancing between two buses on the same route.
- A swap must:
  - Validate the destination bus has an open seat (never allow overbooking via a swap).
  - Immediately invalidate the old QR code (so it can no longer be scanned/boarded) and generate a new one for the new trip.
  - Send the rider a swap notification email with the new QR code and trip details.
  - Be fully logged (who performed the swap, when, from which trip to which trip, optional reason) for accountability.
- Supervisors should be able to do this from a live operational view (e.g., "Bus 4 is full and Bus 7 has 6 free seats, move these 3 people over") without needing to dig through raw database tools.

### 3.6 Live roster / supervisor operations view
- Bus supervisors need a real-time dashboard per active trip showing: full passenger manifest, who has boarded (green/checked) vs who hasn't (pending) vs who cancelled, current seat count vs capacity, and quick access to swap/cancel actions per rider.
- This view should update live as scans happen (websocket or polling — your call, but it must feel real-time, not require a manual page refresh).

---

## 4. Roles and Distinct Interfaces

Build genuinely separate interfaces per role — not one UI with conditionally hidden buttons. Each role should feel like a purpose-built tool for that job.

| Role | Who | Core capabilities |
|---|---|---|
| **Rider** (student/faculty) | Anyone with valid ERP login | Browse available routes/trips, book a seat, view/download their QR code, cancel (within policy), view booking history, receive email notifications |
| **Bus driver** | Created/managed by admin (not an ERP-derived role) | Mobile-friendly QR scanner only — minimal interface, scan and see instant valid/invalid/wrong-bus feedback, see today's assigned trip(s) |
| **Bus supervisor** | Created/managed by admin | Everything the driver has, plus: live roster dashboard, swap riders between buses, cancel a rider's booking on their behalf (e.g., no-show handling), view trip-level reporting |
| **Admin** | University staff managing the whole system | Manage routes/buses/schedules/capacity, manage driver and supervisor accounts, configure cancellation lock window and other policy settings, view system-wide reporting and audit logs, manually intervene in any booking |

Design considerations:
- Rider interface should be optimized for mobile (most students will book and show their QR from a phone).
- Driver interface should be a near-single-purpose scanning tool — assume a driver is using this standing at a bus door, possibly with poor connectivity; design for speed and large tap targets, minimal text.
- Supervisor interface is closer to an operations console — denser information, built for someone managing a dynamic situation.
- Admin interface is the full control panel.

Each role logs in through the same university SSO flow described in Section 2, except driver/supervisor accounts, which are created and assigned by an admin (they may or may not also have ERP accounts — admin decides at creation whether to link an existing ERP identity or create a standalone driver/supervisor credential).

---

## 5. Scale and Reliability Requirements

This is a hard, non-negotiable requirement: **the system must never show a hard error or fail to let someone attempt to book, even under extreme simultaneous load.** Expected peak load can exceed 200,000 concurrent users in short bursts (e.g., everyone trying to book at the moment registration opens), but this won't be the case most of the time — the system must scale dynamically and not waste resources or cost during quiet periods.

Design requirements:

1. **Dynamic horizontal autoscaling.** The booking service must scale out automatically under load and scale back down when load subsides. Do not provision for constant peak capacity — that wastes resources during the other 99% of the time. Use autoscaling groups / serverless containers / managed autoscaling (e.g., Kubernetes HPA, AWS ECS/Fargate autoscaling, or equivalent) rather than fixed-size infrastructure.
2. **Queue-based booking under contention.** For high-demand moments (e.g., a popular route's booking window opening), do not let raw concurrent writes race against each other. Use a queue (e.g., a message queue or a request-admission queue with a "you're in line, hold tight" UI state) so that instead of throwing an error when a seat-claiming race occurs, the user is told to wait a moment and the request is processed in order. Nobody should see a 500 error or a frozen page — they should see "processing your request" / "you're in queue position X" type feedback.
3. **No overselling seats.** Use proper locking/transactional integrity (e.g., atomic decrement with conditional check, or a distributed lock) so two people can never be confirmed into the same last seat. If a seat is taken in the moment between viewing and submitting, the user should get a clear, friendly "this seat was just taken, here are other options" — never a silent failure or a confusing crash.
4. **Caching and read scaling.** Route lists, schedules, and seat-availability counts (which are read constantly and far more often than they're written) should be cache-backed (e.g., Redis) and read-replica friendly, so read traffic doesn't bottleneck on the primary write database.
5. **Graceful degradation, not failure.** If a downstream dependency (e.g., email sending) is slow or temporarily unavailable, the booking itself must still succeed — emails should be sent asynchronously via a background job/queue, decoupled from the booking transaction, with retry logic. A booking should never fail or roll back just because the email service had a hiccup.
6. **Load testing.** Before considering this production-ready, simulate burst load (e.g., using k6, Locust, or Artillery) at multiples of expected peak (aim to test comfortably beyond 200,000 concurrent, e.g., 300–400K simulated) and report actual behavior under that load — error rate, response time distribution, autoscaling behavior — not just a theoretical claim that it "should" handle it.
7. **Cost-awareness.** Document the expected cost profile: idle/baseline cost vs burst cost, and what's driving each, so this is a known and intentional tradeoff, not a surprise bill.

---

## 6. Working Process — Ask, Don't Assume

For every meaningful decision not already pinned down in this brief, ask me directly rather than guessing or picking a default silently. This includes (non-exhaustive):

- Tech stack choices (backend language/framework, frontend framework, database engine, hosting provider/cloud — propose options with tradeoffs, let me choose).
- Email service provider for sending the QR code emails (e.g., SES, SendGrid, Resend) — propose options.
- Exact QR code signing approach and library.
- Specific UI/visual design direction once we get to that stage (don't unilaterally pick a "look" — show me directions and let me pick, similar to how this conversation worked).
- Anything discovered in Phase 0 that's ambiguous or where the legacy data is messy/inconsistent.
- Any tradeoff between cost, complexity, and the 200,000-user scaling requirement (e.g., serverless vs. container-based approaches) — present the tradeoff, don't silently pick one.

Work in clearly defined phases, each ending in a checkpoint where you report back before moving to the next phase:

1. **Phase 0**: Discovery report on the legacy ERP system (Section 1).
2. **Phase 1**: Proposed architecture (stack, hosting, database schema, authentication flow) — for my approval before any code is written.
3. **Phase 2**: Data migration — pull routes/schedules/rosters from the legacy system into the new schema.
4. **Phase 3**: Core booking + QR + email pipeline (rider-facing).
5. **Phase 4**: Driver/supervisor scanning + live roster + swap/cancel tooling.
6. **Phase 5**: Admin panel.
7. **Phase 6**: Scale testing and hardening per Section 5.
8. **Phase 7**: Final review, deployment plan, handover documentation.

Do not skip ahead or silently merge phases. At the end of each phase, summarize what was built, what decisions were made and why, and what you need from me before continuing.

---

## 7. Definition of "State of the Art" for This Project

To be explicit about the bar, "state of the art" here means:

- A rider can book a seat in a handful of taps/clicks, get a QR code instantly, and never see a confusing error.
- A driver can scan a phone screen and get an unambiguous valid/invalid/wrong-bus result in under a second.
- A supervisor has full situational awareness of their bus in real time and can resolve problems (swaps, no-shows) without friction.
- The system holds up identically whether 50 people or 200,000 people hit it at once — the only difference is invisible to the user (queueing feedback at extreme peaks, not breakage).
- Every cancellation, swap, and boarding event is logged and auditable.
- No password is ever stored. No seat is ever oversold. No booking is ever silently lost.

If a future decision would compromise any of the above, flag it to me explicitly rather than quietly trading it off.
