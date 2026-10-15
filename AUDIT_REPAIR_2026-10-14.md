# Galala booking audit and repair — 14 October 2026

## Scope and evidence

The live development site is served from the `Galala Clone` VirtualBox VM. The Windows checkout and VM started at Git commit `ce48597bdfad28a01788e413abc9cd4c42fdca09`. A VM PostgreSQL backup was saved at `/home/abdelrahman/aesh_before_repair_20261014.dump` before database changes. The route-stop migration also retained all original rows in `stops_dedupe_backup_20261014`.

The checks used bounded HTTP requests and clearly named temporary QA records. No load or stress test was run. The exact Gemini Argon 4 High model was unavailable after updating Antigravity; no different model was substituted, so independent model review remains incomplete.

## Confirmed and repaired

| Finding | Evidence | Repair and verification |
| --- | --- | --- |
| Public registration accepted privileged roles | `RegisterSchema` accepted `admin` and `supervisor`; the public handler inserted the requested role without authorization. | Public registration now accepts and assigns only `rider`. Live `admin` role probe returned HTTP 400 and created no account. |
| Shared published staff password | Published password authenticated live admin and supervisor accounts; 24 accounts shared its hash. | All 24 affected accounts received unique random passwords, sessions were invalidated, and the published password stopped working. Private credential record is outside the repository. Seeding no longer gives personnel the administrator bootstrap password. |
| Trip listing exposed passenger and staff contact details | Public `GET /api/trips` serialized passenger identity, phone, academic ID, boarding code, and staff contacts. | Public projection now omits those fields; authenticated staff explicitly request the manifest. During a live QA booking, public trip data showed one occupied seat with no passenger details. Staff projection without authentication returned HTTP 401. |
| Public GET could create trips | `autoSeed=true` on `/api/trips` generated database rows. | Removed the write path. Live request returned zero trips and created none. |
| Repeated route stops | Live database had 1,122 stop rows, with 1,056 repeated route/order positions. | Migration retained a backup, removed duplicates, and installed a unique index. Live database now has 66 stops and zero repeated positions; public route payload fell from about 296 KB to 22 KB. |
| Mock card method granted paid passes | `visa_mock` marked bookings paid without a processor. | Disabled unless explicitly enabled on both API and web build. |
| Unverified receipts granted boarding | Instapay/Telda bookings issued confirmed passes before any transfer check. | Receipt evidence is required for paid trips. Pending receipts cannot board by QR, single manual action, or bulk action. An admin-only endpoint marks a receipt paid after manual reconciliation. Rider and supervisor views show pending state. Live QA QR and manual board attempts were blocked. |
| QR expired before future departures | Expiry was 24 hours after booking even when the trip was much later. | Expiry now follows the trip departure. Live QA booking for a future date had an expiry after that date. |
| Cache test could report false success | The test used non-throwing `console.assert` and depended on a Redis connection. | Strict assertions and deterministic in-memory mode now pass. Cache pattern invalidation uses Redis scanning instead of `KEYS`. |

## Development timetable and live journey

The repository's `REAL_SCHEDULES` end in June 2026. The university's public ERP booking page returned HTTP 500 from `/search_bus` for two October route searches. The university site confirms general bus service but provides no date-specific October route/bus assignments. The user authorized creating a schedule, so a separate **development-only** route and bus were added, named `CODEX DEVELOPMENT TEST ROUTE - NO REAL SERVICE` and `CODEX DEVELOPMENT BUS - NOT OPERATING`. It has 12 zero-fare trips from 15–21 October 2026, excluding Friday, with no assigned driver or supervisor. The idempotent source is `scripts/create-development-schedule-20261014.sql`. These records must not be represented as university-operated service.

The live QA script created an isolated administrator shift and rider, rejected a paid booking without receipt evidence, booked a paid trip, checked public redaction and pending-payment boarding rejection, then booked and boarded a zero-fare development trip. It removed the QA rider, bookings, and shift. A separate database query confirmed zero remaining QA users, bookings, and trips. The permanent development timetable is intentionally retained.

## Remaining work and limits

- **Official timetable:** No verified October university timetable was available. Only the marked development route is bookable. Replace it with confirmed operations data before real rider use.
- **Payments:** Manual reconciliation exists as an admin API, without an integrated review screen or payment processor callback. Unverified paid reservations still occupy seats until an administrator acts; an expiry/rejection policy needs an operational decision.
- **Dependencies:** The deployed Docker image reports 9 production dependency advisories (8 high, 1 moderate, zero critical). Next.js was upgraded from 15.5.19 to 15.5.27, the JWT verifier to `fast-jwt` 6.3.4, and Axios, Fastify, and Nodemailer to patched releases. Local and VM builds and the live smoke journey passed. The remaining high advisories are in `brace-expansion`, `drizzle-orm`, `fast-uri`, `find-my-way`, `nanoid`, `postcss`, `sharp`, and `source-map-js`; each needs a compatible dependency update and runtime review.
- **Independent review:** Gemini Argon 4 High was not present in the updated Antigravity model list. No Argon review or debate occurred.
- **Load and failure testing:** Request volume was bounded. Redis outage, high concurrency, and sustained load were not exercised against the live VM. The existing unique active-seat index was inspected, and the in-memory cache behavior was tested locally.
