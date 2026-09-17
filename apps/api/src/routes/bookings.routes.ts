import { FastifyInstance } from 'fastify';
import { CreateBookingSchema, CreateRoundTripBookingSchema, CancelBookingSchema, SwapBookingSchema, QRCodec, generateBoardingCode } from '@bus-aesh/shared';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { redis } from '../redis.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';
import { EmailService } from '../services/email.service.js';
import { getHoursUntilDeparture } from '../utils/trip-time.js';
import { CacheService } from '../services/cache.service.js';

const jwtSecret = process.env.JWT_SECRET || '';
const QR_EXPIRY_HOURS = 24;

function getQrExpiresAt(): Date {
  return new Date(Date.now() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
}

import { randomBytes } from 'node:crypto';

function generatePaymentId(): string {
  return `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

function generateBookingRef(): string {
  return `GU-${randomBytes(5).toString('hex').toUpperCase()}`;
}

type BookingConfirmation = {
  studentName: string;
  studentId: string;
  studentEmail: string;
  route: string;
  pickup: string;
  dropoff: string;
  date: string;
  departureTime: string;
  returnTime: string;
  seatNumber: number;
  returnSeatNumber?: number;
  price: string;
  bookingRef: string;
  paymentRef: string;
};

async function sendBookingConfirmation(booking: BookingConfirmation): Promise<void> {
  const webhookUrl = process.env.N8N_BOOKING_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('N8N_BOOKING_WEBHOOK_URL is not configured; ticket email was not requested.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(booking),
    });

    if (!response.ok) {
      console.error(`Booking confirmation webhook failed (${response.status}) for ${booking.bookingRef}.`);
    }
  } catch (error) {
    console.error(`Booking confirmation webhook failed for ${booking.bookingRef}:`, error);
  }
}


export async function bookingsRoutes(fastify: FastifyInstance) {
  // 1. Create one-way booking (Pessimistic Lock & Unique Index Concurrency Proof)
  fastify.post('/api/bookings', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const bodyResult = CreateBookingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid booking request';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
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
        const bookingRef = generateBookingRef();

        const boardingCode = generateBoardingCode();

        const [booking] = await tx.insert(schema.bookings).values({
          tripId,
          userId,
          seatNumber,
          status: 'confirmed',
          bookingType,
          legType,
          boardingCode,
          bookingRef,
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
    try {
      await redis.del(`seat_lock:${tripId}:${seatNumber}`);
    } catch (err) {
      console.warn(`Failed to delete seat lock for trip ${tripId} seat ${seatNumber}:`, err);
    }

    // Broadcast seat booked event to all connected clients
    WebSocketHub.broadcastToTripRoom(tripId, {
      type: 'seat_booked',
      tripId,
      seatNumber,
    });

    await CacheService.invalidateSeatCache(tripId);
    await CacheService.invalidateTripsAndFleetCache(tripId);

    // Send confirmation email
    EmailService.sendConfirmationEmail(userEmail, userName, trip, seatNumber, qrToken, legType, bookingType, booking.paymentId!).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });

    // Payment confirmation must never wait on, or fail because of, ticket delivery.
    if (booking.paymentStatus === 'paid') {
      void sendBookingConfirmation({
        studentName: userName,
        studentId: request.user.academicId || userId,
        studentEmail: userEmail,
        route: trip.route.nameEn,
        pickup: legType === 'from_campus' ? 'Galala University' : trip.route.nameEn,
        dropoff: legType === 'from_campus' ? trip.route.nameEn : 'Galala University',
        date: trip.tripDate,
        departureTime: trip.departureTime.toISOString(),
        returnTime: trip.departureTime.toISOString(), // one way
        seatNumber,
        price: `${trip.priceEgp || '160'} EGP`,
        bookingRef: booking.bookingRef!,
        paymentRef: booking.paymentId!,
      });
    }

    return {
      success: true,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
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
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid round-trip booking request';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
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
        const bookingRef = generateBookingRef();
        const qrExpiresAt = getQrExpiresAt();

        const arrivalBoardingCode = generateBoardingCode();
        const returnBoardingCode = generateBoardingCode();

        const [arrivalBooking] = await tx.insert(schema.bookings).values({
          tripId: toCampusTripId,
          userId,
          seatNumber: toCampusSeatNumber,
          status: 'confirmed',
          bookingType: 'round_trip',
          legType: 'to_campus',
          boardingCode: arrivalBoardingCode,
          bookingRef,
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
          boardingCode: returnBoardingCode,
          bookingRef,
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

    try {
      await redis.del(`seat_lock:${toCampusTripId}:${toCampusSeatNumber}`);
      await redis.del(`seat_lock:${fromCampusTripId}:${fromCampusSeatNumber}`);
    } catch (err) {
      console.warn('Failed to delete seat locks for round trip:', err);
    }

    WebSocketHub.broadcastToTripRoom(toCampusTripId, { type: 'seat_booked', tripId: toCampusTripId, seatNumber: toCampusSeatNumber });
    WebSocketHub.broadcastToTripRoom(fromCampusTripId, { type: 'seat_booked', tripId: fromCampusTripId, seatNumber: fromCampusSeatNumber });

    await CacheService.invalidateSeatCache(toCampusTripId);
    await CacheService.invalidateSeatCache(fromCampusTripId);
    await CacheService.invalidateTripsAndFleetCache();

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

    if (arrivalBooking.paymentStatus === 'paid') {
      void sendBookingConfirmation({
        studentName: userName,
        studentId: request.user.academicId || userId,
        studentEmail: userEmail,
        route: toCampusTrip.route.nameEn,
        pickup: 'Galala University', // to_campus
        dropoff: toCampusTrip.route.nameEn,
        date: toCampusTrip.tripDate,
        departureTime: toCampusTrip.departureTime.toISOString(),
        returnTime: fromCampusTrip.departureTime.toISOString(),
        seatNumber: toCampusSeatNumber,
        returnSeatNumber: fromCampusSeatNumber,
        price: `${(toCampusTrip.priceEgp || 160) + (fromCampusTrip.priceEgp || 160)} EGP`,
        bookingRef: arrivalBooking.bookingRef!,
        paymentRef: arrivalBooking.paymentId!,
      });
    }

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
      bookingRef: b.bookingRef,
      tripId: b.tripId,
      seatNumber: b.seatNumber,
      status: b.status,
      bookingType: b.bookingType,
      legType: b.legType,
      pairedBookingId: b.pairedBookingId,
      paymentStatus: b.paymentStatus,
      paymentId: b.paymentId,
      receiptRef: b.receiptRef,
      boardingCode: b.boardingCode || ('GU-' + b.id.substring(0, 4).toUpperCase()),
      qrToken: b.qrToken,
      qrExpiresAt: b.qrExpiresAt,
      qrUsedAt: b.qrUsedAt,
      cancelReason: b.cancelReason,
      cancelledAt: b.cancelledAt,
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

  // 4. Cancel booking (Supports Rider self-cancellation & Supervisor operational cancellation with refund)
  fastify.post('/api/bookings/cancel', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const bodyResult = CancelBookingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid cancellation request';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
    }

    const { bookingId, reason } = bodyResult.data;
    const userId = request.user.id;
    const userRole = request.user.role;

    const booking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: { 
        trip: { with: { route: true, bus: true } },
        user: true,
        boardingLogs: true,
      },
    });

    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return reply.status(400).send({ error: 'Booking has already been cancelled.' });
    }

    // A. Supervisor or Administrator Cancellation: Pre-boarding + 5-Hour Limit + Refund
    if (userRole === 'supervisor' || userRole === 'admin') {
      const isAlreadyBoarded = booking.qrUsedAt !== null || 
        (booking.boardingLogs && booking.boardingLogs.some(log => log.scanResult === 'valid'));

      if (isAlreadyBoarded) {
        return reply.status(400).send({
          error: 'Cannot cancel ticket: Passenger has already boarded the bus. Cancellation must be performed before boarding.',
          messageAr: 'لا يمكن إلغاء التذكرة: الراكب صعد بالفعل إلى الحافلة. يجب إجراء الإلغاء قبل الصعود.',
          isBoarded: true,
          boardedAt: booking.qrUsedAt,
        });
      }

      const hoursUntilDeparture = getHoursUntilDeparture(
        booking.trip.tripDate,
        booking.trip.departureTime,
        booking.trip.timeSlot
      );

      const SUPERVISOR_CANCELLATION_MIN_HOURS = 5;

      if (hoursUntilDeparture < SUPERVISOR_CANCELLATION_MIN_HOURS) {
        const hoursRemainingText = hoursUntilDeparture > 0 ? `${hoursUntilDeparture.toFixed(1)} hours remaining` : 'trip has already departed';
        return reply.status(400).send({
          error: `Supervisor cancellation locked: Cancellation is only permitted at least 5 hours prior to trip departure (${hoursRemainingText}).`,
          messageAr: `تم إغلاق الإلغاء للمشرف: يُسمح بالإلغاء فقط قبل 5 ساعات على الأقل من موعد تحرك الرحلة (المتبقي: ${hoursUntilDeparture > 0 ? hoursUntilDeparture.toFixed(1) + ' ساعة' : 'الرحلة تحركت بالفعل'}).`,
          hoursRemaining: hoursUntilDeparture,
        });
      }

      const supervisorName = request.user.fullName || request.user.email || 'Supervisor';
      const detailedReason = `Cancelled by Supervisor (${supervisorName}): ${reason || 'Operational adjustment'}. Full refund (160 EGP) processed.`;

      const cancelData = {
        status: 'cancelled' as const,
        paymentStatus: 'refunded' as const,
        cancelledAt: new Date(),
        cancelReason: detailedReason,
        updatedAt: new Date(),
      };

      await db.update(schema.bookings).set(cancelData).where(eq(schema.bookings.id, bookingId));

      await db.insert(schema.auditLogs).values({
        userId: request.user.id,
        action: 'SUPERVISOR_CANCEL_REFUND',
        entityType: 'booking',
        entityId: booking.id,
        details: {
          bookingId: booking.id,
          seatNumber: booking.seatNumber,
          studentId: booking.userId,
          studentName: booking.user?.fullName,
          studentEmail: booking.user?.email,
          tripId: booking.tripId,
          refundAmount: 160,
          refundStatus: 'refunded',
          reason: reason || 'Cancelled by supervisor with full refund',
          performedBy: request.user.email,
        },
      });

      const boardingCode = booking.boardingCode || ('GU-' + booking.id.substring(0, 4).toUpperCase());

      const cancellationNotice = {
        type: 'SUPERVISOR_CANCELLED_TICKET',
        bookingId: booking.id,
        boardingCode,
        seatNumber: booking.seatNumber,
        tripId: booking.tripId,
        routeNameAr: booking.trip.route?.nameAr || 'خط الجلالة',
        routeNameEn: booking.trip.route?.nameEn || 'Galala Route',
        departureTime: booking.trip.departureTime,
        refundAmount: 160,
        paymentStatus: 'refunded',
        reason: reason || 'Cancelled by supervisor',
        messageAr: `⚠️ تنبيه هام: قام مشرف الرحلة بإلغاء حجزك للمقعد رقم (${booking.seatNumber}) على رحلة (${booking.trip.route?.nameAr || 'الجلالة'}). تم استرداد المبلغ بالكامل (160 ج.م) لحسابك فوراً.`,
        messageEn: `⚠️ Important Notice: The supervisor has cancelled your ticket for seat ${booking.seatNumber} (${booking.trip.route?.nameEn || 'Galala Trip'}). A full refund of 160 EGP has been refunded to your account.`,
        timestamp: new Date().toISOString(),
      };

      WebSocketHub.sendToUser(booking.userId, cancellationNotice);

      WebSocketHub.broadcastToTripRoom(booking.tripId, {
        type: 'seat_unlocked',
        tripId: booking.tripId,
        seatNumber: booking.seatNumber,
      });
      WebSocketHub.broadcastToTripRoom(booking.tripId, cancellationNotice);
      WebSocketHub.broadcastToTripRoom(booking.tripId, {
        type: 'booking_cancelled',
        bookingId: booking.id,
        seatNumber: booking.seatNumber,
      });

      if (booking.pairedBookingId) {
        const pairedBooking = await db.query.bookings.findFirst({
          where: eq(schema.bookings.id, booking.pairedBookingId),
          with: { trip: { with: { route: true } } },
        });
        if (pairedBooking && pairedBooking.status !== 'cancelled') {
          await db.update(schema.bookings)
            .set({ 
              ...cancelData, 
              cancelReason: `Paired booking cancelled with refund by Supervisor (${supervisorName}): ${reason || 'Operational adjustment'}` 
            })
            .where(eq(schema.bookings.id, booking.pairedBookingId));

          WebSocketHub.broadcastToTripRoom(pairedBooking.tripId, {
            type: 'seat_unlocked',
            tripId: pairedBooking.tripId,
            seatNumber: pairedBooking.seatNumber,
          });
          WebSocketHub.broadcastToTripRoom(pairedBooking.tripId, cancellationNotice);
          WebSocketHub.broadcastToTripRoom(pairedBooking.tripId, {
            type: 'booking_cancelled',
            bookingId: pairedBooking.id,
            seatNumber: pairedBooking.seatNumber,
          });
          await CacheService.invalidateSeatCache(pairedBooking.tripId);
        }
      }

      await CacheService.invalidateSeatCache(booking.tripId);
      await CacheService.invalidateTripsAndFleetCache();

      return {
        success: true,
        message: 'Booking cancelled successfully with full refund.',
        messageAr: 'تم إلغاء الحجز بنجاح وإصدار أمر استرداد كامل للمبلغ (160 ج.م).',
        refundStatus: 'refunded',
        refundAmount: 160,
        boardingCode,
      };
    }

    // B. Rider Self-Cancellation
    if (booking.userId !== userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    if (booking.qrUsedAt) {
      return reply.status(400).send({ error: 'Cannot cancel an already boarded ticket.' });
    }

    const hoursUntilDeparture = getHoursUntilDeparture(
      booking.trip.tripDate,
      booking.trip.departureTime,
      booking.trip.timeSlot
    );
    if (hoursUntilDeparture < booking.trip.cancellationLockHours) {
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
        await CacheService.invalidateSeatCache(pairedBooking.tripId);
      }
    }

    await CacheService.invalidateSeatCache(booking.tripId);
    await CacheService.invalidateTripsAndFleetCache();

    return { success: true };
  });
}
