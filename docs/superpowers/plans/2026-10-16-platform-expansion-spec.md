# Bus Aesh platform expansion specification

Status: proposed; no feature implementation or purchasing authorized by this document. Baseline: 1.3.0 plus current main documentation.

## Product scope

Build all previously proposed ideas as independently releasable capabilities:

1. Arabic/English booking assistant grounded in live availability.
2. Read-only administrator operations assistant.
3. Timetable PDF/image import assistant with approval preview.
4. Rider support assistant with authenticated booking context and escalation.
5. Disruption assistant with impact analysis and approved messages/alternatives.
6. Historical demand forecasting and capacity recommendations.
7. Receipt extraction and duplicate-risk review assistant.
8. Waitlist with expiring seat offers.
9. Departure reminders and service alerts.
10. Live bus location and observation-based arrival estimates.
11. Saved recurring journey preferences without automatic booking.
12. Mobile Arabic/RTL, zero-fare round-trip booking, and supervisor manifest parity.
13. Email delivery operations dashboard.
14. Wallet tickets, starting with Google Wallet; Apple Wallet is a separately gated extension.
15. Operations analytics for occupancy, no-shows, cancellations, boarding, and demand.

## Constraints and decisions

- Preserve TypeScript, Fastify, Next.js, Expo, PostgreSQL/Drizzle, Redis, existing SMTP, and the current visual identity. Do not rewrite the platform or upgrade Expo as part of unrelated features.
- Store authoritative bookings, schedules, reservations, jobs, permissions, and audit records in PostgreSQL. Redis is temporary coordination/cache.
- Default institutional time zone: `Africa/Cairo`. Store instants in UTC, preserve local service date/time and zone, and test daylight-saving boundaries.
- Keep mobile paid booking disabled. Zero-fare round trips require an explicit shared/API contract extension and independent fare checks for both legs.
- Reuse application services from HTTP handlers and AI tools. Models have no database credentials, SQL execution, or unrestricted HTTP tools.
- AI output is advisory. Existing API authorization and transaction rules govern every action; AI cannot approve payment, issue refunds, publish schedules, or change capacity autonomously.
- Start with server-side Gemini through the official JavaScript SDK, with an environment-configured, account-verified model. Model names, availability, pricing, quotas, and retention terms are deployment gates, not assumptions. Do not assume a CLI review model is available through the production API.
- Use one provider initially; do not add orchestration frameworks, vector databases, Python services, or a fleet of autonomous agents without demonstrated need.
- New notifications go only to enrolled users/devices according to preferences. OTP and operational notices keep distinct purposes. Model/provider outages must not block normal booking/scanning.
- No real timetable, GPS location, ETA, ticket, payment decision, or delivery status may be fabricated.
- Use the labeled development fixture and approved QA recipients for bounded live tests. Preserve existing rider data. Native iOS verification requires macOS/Xcode.

## Acceptance and release policy

Each capability has its own migration, server authorization, UI states, focused regression checks, rollback/disable behavior, documentation, and release decision. Builds and device/browser checks are required where the capability changes runtime behavior. A published source archive is not evidence of mailbox receipt, GPS accuracy, a device journey, or store signing.

This is a roadmap, not a fixed-duration promise. Start with foundation, mobile parity, notifications, waitlist, email operations, and basic analytics. AI search/support follow those stable services. GPS, wallets, document imports, and forecasting have additional credentials/data dependencies. Release numbers are assigned when scope is approved; do not promise all tracks in one release.
