import { and, asc, count, eq, inArray, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { EmailService } from './email.service.js';
import { EmailDeliveryError, MailService } from './mail.service.js';

const MAX_ATTEMPTS = 10;
const CLAIM_LEASE_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;

type OutboxJob = typeof schema.emailOutbox.$inferSelect;

function safeErrorCode(error: unknown): string {
  if (error instanceof EmailDeliveryError) return error.errorCode;
  if (error instanceof Error && /^[A-Z0-9_-]{1,80}$/.test(error.message)) return error.message;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && /^[A-Z0-9_-]{1,40}$/i.test(code)) return code;
  }
  return 'EMAIL_WORKER_ERROR';
}

export class EmailOutboxService {
  private static timer: NodeJS.Timeout | null = null;
  private static running = false;

  static async enqueueBookingConfirmation(tx: any, bookingIds: string[]): Promise<void> {
    const normalizedIds = [...new Set(bookingIds)].sort();
    if (normalizedIds.length === 0) throw new Error('At least one booking is required for an email outbox job.');

    await tx.insert(schema.emailOutbox).values({
      eventKey: `booking-confirmation:${normalizedIds.join(':')}`,
      eventType: 'booking_confirmation',
      payload: { bookingIds: normalizedIds },
    }).onConflictDoNothing({ target: schema.emailOutbox.eventKey });
  }

  static async enqueueSwapNotification(tx: any, swapLogId: number): Promise<void> {
    await tx.insert(schema.emailOutbox).values({
      eventKey: `swap-notification:${swapLogId}`,
      eventType: 'swap_notification',
      payload: { swapLogId },
    }).onConflictDoNothing({ target: schema.emailOutbox.eventKey });
  }

  static start(): void {
    if (this.timer) return;
    void this.processBatch();
    this.timer = setInterval(() => void this.processBatch(), POLL_INTERVAL_MS);
    this.timer.unref();
  }

  static async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    while (this.running) await new Promise(resolve => setTimeout(resolve, 50));
  }

  static async getSummary(): Promise<{
    status: 'ready' | 'degraded' | 'unconfigured';
    pending: number;
    failed: number;
  }> {
    const rows = await db.select({ status: schema.emailOutbox.status, total: count() })
      .from(schema.emailOutbox)
      .groupBy(schema.emailOutbox.status);
    const totals = new Map(rows.map(row => [row.status, Number(row.total)]));
    const pending = (totals.get('pending') || 0) + (totals.get('sending') || 0);
    const failed = totals.get('failed') || 0;
    const mailHealth = MailService.getHealth().status;
    const status = mailHealth === 'unconfigured'
      ? 'unconfigured'
      : mailHealth === 'ready' && failed === 0
        ? 'ready'
        : 'degraded';
    return { status, pending, failed };
  }

  static async retryFailed(jobId: string): Promise<boolean> {
    const [job] = await db.update(schema.emailOutbox)
      .set({
        status: 'pending',
        attempts: 0,
        availableAt: new Date(),
        lockedUntil: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.emailOutbox.id, jobId), eq(schema.emailOutbox.status, 'failed')))
      .returning({ id: schema.emailOutbox.id });
    return Boolean(job);
  }

  private static async processBatch(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let index = 0; index < BATCH_SIZE; index += 1) {
        const job = await this.claimNext();
        if (!job) break;
        await this.processJob(job);
      }
    } catch (error) {
      console.warn(`[EmailOutbox] Worker cycle failed (${safeErrorCode(error)}).`);
    } finally {
      this.running = false;
    }
  }

  private static async claimNext(): Promise<OutboxJob | null> {
    const now = new Date();
    return db.transaction(async tx => {
      const [candidate] = await tx.select()
        .from(schema.emailOutbox)
        .where(or(
          and(eq(schema.emailOutbox.status, 'pending'), lte(schema.emailOutbox.availableAt, now)),
          and(eq(schema.emailOutbox.status, 'sending'), lte(schema.emailOutbox.lockedUntil, now)),
        ))
        .orderBy(asc(schema.emailOutbox.availableAt), asc(schema.emailOutbox.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });

      if (!candidate) return null;
      const [claimed] = await tx.update(schema.emailOutbox)
        .set({
          status: 'sending',
          attempts: candidate.attempts + 1,
          lockedUntil: new Date(now.getTime() + CLAIM_LEASE_MS),
          updatedAt: now,
        })
        .where(eq(schema.emailOutbox.id, candidate.id))
        .returning();
      return claimed || null;
    });
  }

  private static async processJob(job: OutboxJob): Promise<void> {
    try {
      await this.deliver(job);
      const now = new Date();
      await db.update(schema.emailOutbox)
        .set({ status: 'sent', sentAt: now, lockedUntil: null, lastError: null, updatedAt: now })
        .where(eq(schema.emailOutbox.id, job.id));
    } catch (error) {
      const attempts = job.attempts;
      const now = new Date();
      const exhausted = attempts >= MAX_ATTEMPTS;
      const delayMs = Math.min(60 * 60 * 1000, 30_000 * (2 ** Math.max(0, attempts - 1)));
      const errorCode = safeErrorCode(error);
      await db.update(schema.emailOutbox)
        .set({
          status: exhausted ? 'failed' : 'pending',
          availableAt: new Date(now.getTime() + delayMs),
          lockedUntil: null,
          lastError: errorCode,
          updatedAt: now,
        })
        .where(eq(schema.emailOutbox.id, job.id));
      console.warn(`[EmailOutbox] Job ${job.id} ${exhausted ? 'exhausted retries' : 'will retry'} (${errorCode}).`);
    }
  }

  private static async deliver(job: OutboxJob): Promise<void> {
    if (job.eventType === 'booking_confirmation' && 'bookingIds' in job.payload) {
      const ids = job.payload.bookingIds;
      if (ids.length < 1 || ids.length > 2) throw new Error('OUTBOX_BOOKING_COUNT_INVALID');
      const bookings = await db.query.bookings.findMany({
        where: inArray(schema.bookings.id, ids),
        with: { user: true, trip: { with: { route: true } } },
      });
      if (bookings.length !== ids.length) throw new Error('OUTBOX_BOOKING_MISSING');
      if (bookings.some(booking => !['confirmed', 'swapped'].includes(booking.status) || booking.paymentStatus !== 'paid')) return;

      const first = bookings[0];
      if (!first.user || !first.trip?.route || !first.qrToken) throw new Error('OUTBOX_BOOKING_DATA_MISSING');
      if (bookings.some(booking => booking.userId !== first.userId || booking.user?.email !== first.user.email)) {
        throw new Error('OUTBOX_BOOKING_PAIR_MISMATCH');
      }

      if (bookings.length === 1) {
        if (first.bookingType === 'round_trip') throw new Error('OUTBOX_ROUND_TRIP_PAIR_MISSING');
        await EmailService.sendConfirmationEmail(
          first.user.email,
          first.user.fullName,
          first.trip,
          first.seatNumber,
          first.qrToken,
          first.legType,
          first.bookingType,
          first.paymentId || first.bookingRef || first.id,
        );
        return;
      }

      const toCampus = bookings.find(booking => booking.legType === 'to_campus');
      const fromCampus = bookings.find(booking => booking.legType === 'from_campus');
      if (!toCampus?.trip?.route || !fromCampus?.trip?.route || !toCampus.qrToken || !fromCampus.qrToken) {
        throw new Error('OUTBOX_ROUND_TRIP_DATA_MISSING');
      }
      await EmailService.sendRoundTripEmailConfirmation(
        first.user.email,
        first.user.fullName,
        toCampus.trip,
        toCampus.seatNumber,
        toCampus.qrToken,
        fromCampus.trip,
        fromCampus.seatNumber,
        fromCampus.qrToken,
        toCampus.paymentId || toCampus.bookingRef || toCampus.id,
      );
      return;
    }

    if (job.eventType === 'swap_notification' && 'swapLogId' in job.payload) {
      const swap = await db.query.swapLogs.findFirst({ where: eq(schema.swapLogs.id, job.payload.swapLogId) });
      if (!swap?.newBookingId || !swap.oldTripId || !swap.newTripId) throw new Error('OUTBOX_SWAP_DATA_MISSING');
      const booking = await db.query.bookings.findFirst({
        where: eq(schema.bookings.id, swap.newBookingId),
        with: { user: true, trip: { with: { route: true } } },
      });
      if (!booking || booking.status !== 'swapped' || booking.tripId !== swap.newTripId || !booking.qrToken) return;
      const oldTrip = await db.query.trips.findFirst({
        where: eq(schema.trips.id, swap.oldTripId),
        with: { route: true },
      });
      if (!booking.user || !booking.trip?.route || !oldTrip?.route) throw new Error('OUTBOX_SWAP_TRIP_MISSING');
      await EmailService.sendSwapNotificationEmail(
        booking.user.email,
        booking.user.fullName,
        oldTrip,
        booking.trip,
        booking.seatNumber,
        booking.qrToken,
      );
      return;
    }

    throw new Error('OUTBOX_EVENT_UNSUPPORTED');
  }
}
