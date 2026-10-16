# Task 1 execution record

Scope selected by the user: foundation only. AI, mobile parity, notifications, waitlist, and all other product tracks remain future work.

## Delivered

- Shared creation, paired creation, and supervisor swap services; HTTP routes preserve existing public success response shapes.
- Optional `Idempotency-Key` support for those three routes, scoped to account/operation and canonical validated request. Replay window: 24 hours. Changed request under the same key: HTTP 409. Keyless clients remain compatible.
- Business mutation, replay record, audit entry, and applicable email enqueue occur in the same PostgreSQL transaction.
- Replay metadata prevents repeated Redis deletion, cache/event side effects. Stored swap replay results contain only required prior-trip metadata, not user account records.
- Durable background jobs, schema-validated registered payload, unique event keys, PostgreSQL row claims, two-minute renewable leases, claim fencing, bounded backoff, retained failure after ten attempts, and signal-driven shutdown.
- Separate worker entrypoint and default Compose worker service; existing email outbox worker stays in the API.
- First actual job: bounded cleanup of expired request replay records, enqueued hourly. Future handlers must tolerate at-least-once execution.
- Explicit Cairo wall-clock conversion helper rejects DST gaps/overlaps. Existing cancellation-time behavior is unchanged.
- Migration 0009 and schema snapshot; deployment instructions in README.

## Rulings

- Retain optional request keys for existing client compatibility; retry guarantees apply only when a caller supplies the same key/body. Mobile/web POST generation is not changed in this foundation task.
- Remove redundant creator booking-row locks after adding deterministic advisory seat locks. Unique active-seat constraint remains authoritative. This avoids inversion with supervisor swap row locking.
- Run database checks against uniquely named disposable PostgreSQL databases in the existing VM container, not rider tables. No SMTP sends, live schedule changes, or new public ports are needed.
- Keep current payment policy, including paid mobile restrictions and round-trip payment schema. Zero-fare round-trip schema expansion belongs to Task 2.

## Evidence

- Initial pure check failed on missing implementation; final canonical hashing/key validation and Cairo winter/summer/DST checks pass.
- Shared/API builds and mobile/web TypeScript checks pass.
- Compose YAML parses; API/worker environment configuration matches.
- Isolated database checks cover fresh migrations, concurrent replay/conflicts, changed-payload rejection, per-account scope, expiry, failed-transaction rollback, paired-leg rollback, swap replay and races, seat capacity, and positive-fare rejection.
- Job checks cover transactional enqueue rollback, duplicate event keys, exclusive claims, renewal, lease recovery, stale-worker fencing, retry delay, exhaustion (including expired claims), cleanup, and starting/stopping/restarting worker processes.
- HTTP injection checks confirm original booking response, mismatch 409, malformed-key 400, and replay after cancellation leaving another rider's Redis hold/event state intact.
- Reviewer found replay side effects, retry-limit bypass on expired leases, and lock inversion. All three were fixed; the same reviewer confirmed the fixes.
- A test-cleanup race initially surfaced when force-dropping a database before idle TCP connections finished closing. Cleanup now closes test connections, waits for database disconnects, and drops without force.

## Deployment boundary

Only temporary QA copies were run in the VM. The main API, its checked-out source, live migrations, and live rider data were not replaced. Apply migration 0009 and deploy the API/worker together when this feature is approved for deployment. The temporary databases and copied QA files are removed after checks.
