import { FastifyInstance } from 'fastify';
import { CreateBookingSchema, CreateRoundTripBookingSchema, CancelBookingSchema, SwapBookingSchema, QRCodec } from '@bus-aesh/shared';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { redis } from '../redis.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';
import { EmailService } from '../services/email.service.js';

const jwtSecret = process.env.JWT_SECRET || 'super-secret-aesh-key';
const QR_EXPIRY_HOURS = 24;

function getQrExpiresAt(): Date {
  return new Date(Date.now() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
}

function generatePaymentId(): string {
  return `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

export async function bookingsRoutes(fastify: FastifyInstance) {
  // 1. Create one-way booking (Pessimistic Lock & Unique Index Concurrency Proof)
  fastify.post('/api/bookings', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const bodyResult = CreateBookingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.format() });
    }

    const { tripId, seatNumber, paymentMethod, bookingType, legType, receiptImage, receiptRef } = bodyResult.data;
    const userId = request.user.id;
    const userEmail = request.user.email;
    const userName = request.user.fullName;

    let bookingResult: any;
    try {
      bookingResult = await db.transaction(async (tx) => {
        // Atomic pessimistic lock: lock any existing confirmed booking row
        await tx.execute(sql`
          SELECT id FROM bookings 
          WHERE trip_id = ${tripId} 
            AND seat_number = ${seatNumber} 
            AND status IN ('confirmed', 'swapped') 
          FOR UPDATE
        `);

        // Check seat conflict
        const conflict = await tx.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.tripId, tripId),
            eq(schema.bookings.seatNumber, seatNumber),
            inArray(schema.bookings.status, ['confirmed', 'swapped'])
          ),
        });
        if (conflict) {
          throw new Error('SEAT_ALREADY_BOOKED');
        }

        const trip = await tx.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
          with: { route: true, bus: true },
        });

        if (!trip) {
          throw new Error('Trip not found');
        }

        const paymentStatus = paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded';
        const qrExpiresAt = getQrExpiresAt();
        const paymentId = generatePaymentId();

        const [booking] = await tx.insert(schema.bookings).values({
          tripId,
          userId,
          seatNumber,
          status: 'confirmed',
          bookingType,
          legType,
          paymentId,
          paymentStatus,
          receiptImage,
          receiptRef,
          qrExpiresAt,
        }).returning();

        const qrToken = QRCodec.encode({
          bookingId: booking.id,
          tripId,
          seatNumber,
          date: trip.tripDate,
          version: 1,
          legType: legType as 'to_campus' | 'from_campus',
        }, jwtSecret);

        await tx.update(schema.bookings)
          .set({ qrToken })
          .where(eq(schema.bookings.id, booking.id));

        return { booking, trip, qrToken, paymentId };
      });
    } catch (err: any) {
      if (err.message === 'SEAT_ALREADY_BOOKED' || err?.code === '23505') {
        return reply.status(409).send({
          success: false,
          code: 'SEAT_ALREADY_BOOKED',
          error: 'Seat already booked',
          message: 'عذراً، تم حجز هذا المقعد للتو من قبل راكب آخر. يرجى اختيار مقعد متاح.',
          messageEn: 'This seat was just booked by another student. Please select an available seat.',
        });
      }
      return reply.status(400).send({ error: err.message || 'Booking transaction failed' });
    }

    const { booking, trip, qrToken } = bookingResult;

    // Release temporary Redis lock
    await redis.del(`seat_lock:${tripId}:${seatNumber}`);

    // Broadcast seat booked event to all connected clients
    WebSocketHub.broadcastToTripRoom(tripId, {
      type: 'seat_booked',
      tripId,
      seatNumber,
    });

    // Send confirmation email
    EmailService.sendConfirmationEmail(userEmail, userName, trip, seatNumber, qrToken, legType, bookingType, booking.paymentId!).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });

    return {
      success: true,
      bookingId: booking.id,
      qrToken,
      seatNumber,
      legType,
      bookingType,
    };
  });

  // 2. Create round-trip booking
  fastify.post('/api/bookings/round-trip', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const bodyResult = CreateRoundTripBookingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.format() });
    }

    const { toCampusTripId, toCampusSeatNumber, fromCampusTripId, fromCampusSeatNumber, paymentMethod, receiptImage, receiptRef } = bodyResult.data;
    const userId = request.user.id;
    const userEmail = request.user.email;
    const userName = request.user.fullName;

    let roundTripResult: any;
    try {
      roundTripResult = await db.transaction(async (tx) => {
        const toCampusTrip = await tx.query.trips.findFirst({
          where: eq(schema.trips.id, toCampusTripId),
          with: { route: true, bus: true },
        });
        const fromCampusTrip = await tx.query.trips.findFirst({
          where: eq(schema.trips.id, fromCampusTripId),
          with: { route: true, bus: true },
        });

        if (!toCampusTrip) throw new Error('To-campus trip not found');
        if (!fromCampusTrip) throw new Error('From-campus trip not found');

        // Check seat conflicts with pessimistic lock
        await tx.execute(sql`
          SELECT id FROM bookings 
          WHERE ((trip_id = ${toCampusTripId} AND seat_number = ${toCampusSeatNumber})
             OR  (trip_id = ${fromCampusTripId} AND seat_number = ${fromCampusSeatNumber}))
            AND status IN ('confirmed', 'swapped') 
          FOR UPDATE
        `);

        const toCampusConflict = await tx.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.tripId, toCampusTripId),
            eq(schema.bookings.seatNumber, toCampusSeatNumber),
            inArray(schema.bookings.status, ['confirmed', 'swapped'])
          ),
        });
        if (toCampusConflict) {
          throw new Error('SEAT_ALREADY_BOOKED');
        }

        const fromCampusConflict = await tx.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.tripId, fromCampusTripId),
            eq(schema.bookings.seatNumber, fromCampusSeatNumber),
            inArray(schema.bookings.status, ['confirmed', 'swapped'])
          ),
        });
        if (fromCampusConflict) {
          throw new Error('SEAT_ALREADY_BOOKED');
        }

        const paymentStatus = paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded';
        const paymentId = generatePaymentId();
        const qrExpiresAt = getQrExpiresAt();

        const [arrivalBooking] = await tx.insert(schema.bookings).values({
          tripId: toCampusTripId,
          userId,
          seatNumber: toCampusSeatNumber,
          status: 'confirmed',
          bookingType: 'round_trip',
          legType: 'to_campus',
          paymentId,
          paymentStatus,
          receiptImage,
          receiptRef,
          qrExpiresAt,
        }).returning();

        const [returnBooking] = await tx.insert(schema.bookings).values({
          tripId: fromCampusTripId,
          userId,
          seatNumber: fromCampusSeatNumber,
          status: 'confirmed',
          bookingType: 'round_trip',
          legType: 'from_campus',
          pairedBookingId: arrivalBooking.id,
          paymentId,
          paymentStatus,
          receiptImage,
          receiptRef,
          qrExpiresAt,
        }).returning();

        await tx.update(schema.bookings)
          .set({ pairedBookingId: returnBooking.id })
          .where(eq(schema.bookings.id, arrivalBooking.id));

        const arrivalQR = QRCodec.encode({
          bookingId: arrivalBooking.id,
          tripId: toCampusTripId,
          seatNumber: toCampusSeatNumber,
          date: toCampusTrip.tripDate,
          version: 1,
          legType: 'to_campus',
        }, jwtSecret);

        const returnQR = QRCodec.encode({
          bookingId: returnBooking.id,
          tripId: fromCampusTripId,
          seatNumber: fromCampusSeatNumber,
          date: fromCampusTrip.tripDate,
          version: 1,
          legType: 'from_campus',
        }, jwtSecret);

        await tx.update(schema.bookings).set({ qrToken: arrivalQR }).where(eq(schema.bookings.id, arrivalBooking.id));
        await tx.update(schema.bookings).set({ qrToken: returnQR }).where(eq(schema.bookings.id, returnBooking.id));

        return {
          arrivalBooking,
          returnBooking,
          toCampusTrip,
          fromCampusTrip,
          arrivalQR,
          returnQR,
          paymentId,
        };
      });
    } catch (err: any) {
      if (err.message === 'SEAT_ALREADY_BOOKED' || err?.code === '23505') {
        return reply.status(409).send({
          success: false,
          code: 'SEAT_ALREADY_BOOKED',
          error: 'Seat already booked',
          message: 'عذراً، تم حجز أحد المقاعد للتو من قبل راكب آخر. يرجى اختيار مقاعد متاحة.',
          messageEn: 'One of the selected seats was just booked. Please select available seats.',
        });
      }
      return reply.status(400).send({ error: err.message || 'Round-trip booking failed' });
    }

    const { arrivalBooking, returnBooking, toCampusTrip, fromCampusTrip, arrivalQR, returnQR, paymentId } = roundTripResult;

    await redis.del(`seat_lock:${toCampusTripId}:${toCampusSeatNumber}`);
    await redis.del(`seat_lock:${fromCampusTripId}:${fromCampusSeatNumber}`);

    WebSocketHub.broadcastToTripRoom(toCampusTripId, { type: 'seat_booked', tripId: toCampusTripId, seatNumber: toCampusSeatNumber });
    WebSocketHub.broadcastToTripRoom(fromCampusTripId, { type: 'seat_booked', tripId: fromCampusTripId, seatNumber: fromCampusSeatNumber });

    EmailService.sendRoundTripEmailConfirmation(
      userEmail,
      userName,
      toCampusTrip,
      toCampusSeatNumber,
      arrivalQR,
      fromCampusTrip,
      fromCampusSeatNumber,
      returnQR,
      paymentId
    ).catch(err => {
      console.error('Failed to send round-trip email:', err);
    });

    return {
      success: true,
      arrivalBookingId: arrivalBooking.id,
      returnBookingId: returnBooking.id,
      arrivalQrToken: arrivalQR,
      returnQrToken: returnQR,
      seatNumber: toCampusSeatNumber,
    };
  });

  // 3. User bookings history
  fastify.get('/api/bookings/my', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any) => {
    const userId = request.user.id;
    const bookingsList = await db.query.bookings.findMany({
      where: eq(schema.bookings.userId, userId),
      with: {
        trip: {
          with: {
            route: true,
            bus: true,
            driver: true,
            supervisors: {
              with: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: desc(schema.bookings.createdAt),
    });

    return bookingsList.map(b => ({
      id: b.id,
      tripId: b.tripId,
      seatNumber: b.seatNumber,
      status: b.status,
      bookingType: b.bookingType,
      legType: b.legType,
      pairedBookingId: b.pairedBookingId,
      paymentStatus: b.paymentStatus,
      paymentId: b.paymentId,
      receiptRef: b.receiptRef,
      qrToken: b.qrToken,
      qrExpiresAt: b.qrExpiresAt,
      qrUsedAt: b.qrUsedAt,
      tripDate: b.trip.tripDate,
      timeSlot: b.trip.timeSlot,
      direction: b.trip.direction,
      routeAr: b.trip.route.nameAr,
      routeEn: b.trip.route.nameEn,
      departureTime: b.trip.departureTime,
      riderName: request.user.fullName,
      riderEmail: request.user.email,
      driver: b.trip.driver ? {
        nameAr: b.trip.driver.fullNameAr || b.trip.driver.fullName,
        nameEn: b.trip.driver.fullName,
        phone: b.trip.driver.phone || '',
      } : null,
      supervisors: b.trip.supervisors?.map((s: any) => ({
        nameAr: s.user.fullNameAr || s.user.fullName,
        nameEn: s.user.fullName,
        phone: s.user.phone || '',
      })) || [],
    }));
  });

  // 4. Cancel booking
  fastify.post('/api/bookings/cancel', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const bodyResult = CancelBookingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.format() });
    }

    const { bookingId, reason } = bodyResult.data;
    const userId = request.user.id;
    const userRole = request.user.role;

    const booking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: { trip: true },
    });

    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    if (userRole !== 'rider') {
      return reply.status(403).send({ error: 'Supervisors and administrators cannot cancel tickets' });
    }

    if (booking.userId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const departure = new Date(booking.trip.departureTime);
    const limitMs = booking.trip.cancellationLockHours * 60 * 60 * 1000;
    if (Date.now() > departure.getTime() - limitMs) {
      return reply.status(400).send({
        error: `Cancellation locked. Bookings cannot be cancelled within ${booking.trip.cancellationLockHours} hours of departure.`,
      });
    }

    const cancelData = {
      status: 'cancelled' as const,
      cancelledAt: new Date(),
      cancelReason: reason || 'Cancelled by user',
    };

    await db.update(schema.bookings).set(cancelData).where(eq(schema.bookings.id, bookingId));

    WebSocketHub.broadcastToTripRoom(booking.tripId, {
      type: 'seat_unlocked',
      tripId: booking.tripId,
      seatNumber: booking.seatNumber,
    });
    WebSocketHub.broadcastToTripRoom(booking.tripId, {
      type: 'booking_cancelled',
      bookingId: booking.id,
      seatNumber: booking.seatNumber,
    });

    if (booking.pairedBookingId) {
      const pairedBooking = await db.query.bookings.findFirst({
        where: eq(schema.bookings.id, booking.pairedBookingId),
      });
      if (pairedBooking && pairedBooking.status !== 'cancelled') {
        await db.update(schema.bookings)
          .set({ ...cancelData, cancelReason: `Paired booking cancelled: ${reason || 'Cancelled by user'}` })
          .where(eq(schema.bookings.id, booking.pairedBookingId));

        WebSocketHub.broadcastToTripRoom(pairedBooking.tripId, {
          type: 'seat_unlocked',
          tripId: pairedBooking.tripId,
          seatNumber: pairedBooking.seatNumber,
        });
        WebSocketHub.broadcastToTripRoom(pairedBooking.tripId, {
          type: 'booking_cancelled',
          bookingId: pairedBooking.id,
          seatNumber: pairedBooking.seatNumber,
        });
      }
    }

    return { success: true };
  });
}
