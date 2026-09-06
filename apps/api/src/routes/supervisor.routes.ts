import { FastifyInstance } from 'fastify';
import { SwapBookingSchema, VerifyScanSchema, CancelBookingSchema, QRCodec } from '@bus-aesh/shared';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, inArray, or, sql } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';
import { EmailService } from '../services/email.service.js';
import { getHoursUntilDeparture, getTripDepartureDateTime } from '../utils/trip-time.js';

const jwtSecret = process.env.JWT_SECRET || 'super-secret-aesh-key';
const QR_EXPIRY_HOURS = 24;

function getQrExpiresAt(): Date {
  return new Date(Date.now() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
}

const requireRole = (roles: string[]) => async (request: any, reply: any) => {
  const user = request.user;
  if (!user || !roles.includes(user.role)) {
    return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
  }
};

export async function supervisorRoutes(fastify: FastifyInstance) {
  // 1. Swap / Reassign Booking (Supervisors & Admins only)
  fastify.post('/api/bookings/swap', {
    preValidation: [(fastify as any).authenticate, requireRole(['supervisor', 'admin'])],
  }, async (request: any, reply) => {
    const bodyResult = SwapBookingSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid swap request data';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
    }

    const { bookingId, targetTripId, targetSeatNumber, reason } = bodyResult.data;
    const supervisorId = request.user.id;

    const oldBooking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: {
        trip: { with: { route: true } },
        user: true,
      },
    });

    if (!oldBooking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    const targetConflict = await db.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.tripId, targetTripId),
        eq(schema.bookings.seatNumber, targetSeatNumber),
        inArray(schema.bookings.status, ['confirmed', 'swapped'])
      ),
    });
    if (targetConflict) {
      return reply.status(400).send({ error: 'Target seat is already occupied' });
    }

    const targetTrip = await db.query.trips.findFirst({
      where: eq(schema.trips.id, targetTripId),
      with: { route: true },
    });

    if (!targetTrip) {
      return reply.status(404).send({ error: 'Target trip not found' });
    }

    const oldTripId = oldBooking.tripId;
    const oldSeatNumber = oldBooking.seatNumber;
    const newQrVersion = oldBooking.qrVersion + 1;

    const newQrToken = QRCodec.encode({
      bookingId: oldBooking.id,
      tripId: targetTripId,
      seatNumber: targetSeatNumber,
      date: targetTrip.tripDate,
      version: newQrVersion,
      legType: oldBooking.legType as 'to_campus' | 'from_campus',
    }, jwtSecret);

    await db.update(schema.bookings)
      .set({
        tripId: targetTripId,
        seatNumber: targetSeatNumber,
        qrToken: newQrToken,
        qrVersion: newQrVersion,
        qrExpiresAt: getQrExpiresAt(),
        qrUsedAt: null,
        status: 'swapped',
        updatedAt: new Date(),
      })
      .where(eq(schema.bookings.id, bookingId));

    await db.insert(schema.swapLogs).values({
      oldBookingId: bookingId,
      newBookingId: bookingId,
      performedBy: supervisorId,
      reason: reason || 'Operational seat swap',
      oldTripId,
      oldSeatNumber,
      newTripId: targetTripId,
      newSeatNumber: targetSeatNumber,
    });

    WebSocketHub.broadcastToTripRoom(oldTripId, {
      type: 'seat_unlocked',
      tripId: oldTripId,
      seatNumber: oldSeatNumber,
    });
    WebSocketHub.broadcastToTripRoom(targetTripId, {
      type: 'seat_booked',
      tripId: targetTripId,
      seatNumber: targetSeatNumber,
    });

    EmailService.sendSwapNotificationEmail(
      oldBooking.user.email,
      oldBooking.user.fullName,
      oldBooking.trip,
      targetTrip,
      targetSeatNumber,
      newQrToken
    ).catch(err => {
      console.error('Swap email notification failed:', err.message);
    });

    return { success: true, newQrToken };
  });

  // 2. Scan QR Code & Verify Attendance (Supervisors only)
  fastify.post('/api/scan/verify', {
    preValidation: [(fastify as any).authenticate, requireRole(['supervisor', 'admin'])],
  }, async (request: any, reply) => {
    const bodyResult = VerifyScanSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid scan payload';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
    }

    const { token, expectedLegType, latitude, longitude, deviceInfo } = bodyResult.data;
    const scannerId = request.user.id;

    const cleanToken = token.trim();
    const isManualCode = !cleanToken.includes('.') || cleanToken.toUpperCase().startsWith('GU-');

    let booking: any = null;
    let payload: any = null;

    if (isManualCode) {
      let formattedCode = cleanToken.toUpperCase();
      if (!formattedCode.startsWith('GU-')) {
        formattedCode = `GU-${formattedCode.replace(/^GU/i, '')}`;
      }
      const rawCode = cleanToken.replace(/^GU-/i, '').trim();

      booking = await db.query.bookings.findFirst({
        where: or(
          eq(schema.bookings.boardingCode, formattedCode),
          eq(schema.bookings.boardingCode, cleanToken.toUpperCase()),
          sql`UPPER(${schema.bookings.boardingCode}) = ${formattedCode}`,
          sql`UPPER(${schema.bookings.boardingCode}) = ${cleanToken.toUpperCase()}`,
          sql`REPLACE(UPPER(${schema.bookings.boardingCode}), 'GU-', '') = ${rawCode.toUpperCase()}`,
          sql`CAST(${schema.bookings.id} AS TEXT) ILIKE ${rawCode.toLowerCase() + '%'}`
        ),
        with: {
          user: true,
          trip: { with: { route: true, bus: true } },
          boardingLogs: true,
        },
      });

      if (!booking) {
        return { success: false, result: 'invalid', message: `Invalid Boarding Code: ${formattedCode}` };
      }
    } else {
      const isSignatureValid = QRCodec.verify(token, jwtSecret);
      if (!isSignatureValid) {
        return { success: false, result: 'invalid', message: 'Verification Failed: Tampered or invalid signature' };
      }

      payload = QRCodec.decode(token);

      booking = await db.query.bookings.findFirst({
        where: eq(schema.bookings.id, payload.bookingId),
        with: {
          user: true,
          trip: { with: { route: true, bus: true } },
        },
      });

      if (!booking) {
        return { success: false, result: 'invalid', message: 'No active booking record found' };
      }

      if (booking.qrVersion !== payload.version) {
        return { success: false, result: 'expired', message: 'This QR code is expired. The rider has been assigned a newer seat.' };
      }

      if (expectedLegType && payload.legType !== expectedLegType) {
        return {
          success: false,
          result: 'wrong_leg',
          message: `Wrong QR code: This is a ${payload.legType === 'to_campus' ? 'University' : 'Return'} QR, but scanning for ${expectedLegType === 'to_campus' ? 'University' : 'Return'} leg.`,
          riderName: booking.user.fullName,
          seatNumber: booking.seatNumber,
        };
      }
    }

    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return { success: false, result: 'invalid', message: `Booking is ${booking.status}. Pass code is no longer valid.` };
    }

    if (booking.qrExpiresAt && new Date() > new Date(booking.qrExpiresAt)) {
      return { success: false, result: 'expired', message: 'Pass code has expired (24-hour window passed).' };
    }

    if (booking.qrUsedAt) {
      return {
        success: false,
        result: 'already_checked_in',
        message: `Already boarded at ${new Date(booking.qrUsedAt).toLocaleTimeString()}`,
        riderName: booking.user.fullName,
        seatNumber: booking.seatNumber,
        boardingCode: booking.boardingCode,
      };
    }

    await db.update(schema.bookings)
      .set({ qrUsedAt: new Date() })
      .where(eq(schema.bookings.id, booking.id));

    await db.insert(schema.boardingLogs).values({
      bookingId: booking.id,
      scannedBy: scannerId,
      scanResult: 'valid',
      deviceInfo,
      latitude: latitude ? String(latitude) : undefined,
      longitude: longitude ? String(longitude) : undefined,
    });

    const boardedEvent = {
      type: 'rider_boarded',
      bookingId: booking.id,
      userId: booking.userId,
      riderName: booking.user.fullName,
      seatNumber: booking.seatNumber,
      legType: booking.legType,
      scannedAt: new Date().toISOString(),
    };

    WebSocketHub.broadcastToTripRoom(booking.tripId, boardedEvent);
    WebSocketHub.sendToUser(booking.userId, boardedEvent);

    return {
      success: true,
      result: 'valid',
      riderName: booking.user.fullName,
      seatNumber: booking.seatNumber,
      route: booking.trip.route.nameEn,
      bus: booking.trip.bus.name,
      legType: booking.legType,
      boardingCode: booking.boardingCode || ('GU-' + booking.id.substring(0, 4).toUpperCase()),
    };
  });

  // 3. Trip Manifest
  fastify.get('/api/trips/:tripId/manifest', {
    preValidation: [(fastify as any).authenticate, requireRole(['supervisor', 'admin'])],
  }, async (request: any, reply) => {
    const { tripId } = request.params as { tripId: string };
    const tid = parseInt(tripId);

    if (isNaN(tid)) {
      return reply.status(400).send({ error: 'Invalid tripId' });
    }

    const bookingsList = await db.query.bookings.findMany({
      where: and(
        eq(schema.bookings.tripId, tid),
        inArray(schema.bookings.status, ['confirmed', 'swapped'])
      ),
      with: {
        user: true,
        boardingLogs: {
          orderBy: desc(schema.boardingLogs.scannedAt),
        },
      },
    });

    return bookingsList.map(b => ({
      bookingId: b.id,
      seatNumber: b.seatNumber,
      status: b.status,
      bookingType: b.bookingType,
      legType: b.legType,
      paymentStatus: b.paymentStatus,
      receiptRef: b.receiptRef,
      riderName: b.user.fullName,
      riderEmail: b.user.email,
      boardingCode: b.boardingCode || ('GU-' + b.id.substring(0, 4).toUpperCase()),
      isBoarded: b.boardingLogs.some(log => log.scanResult === 'valid'),
      boardedAt: b.boardingLogs.find(log => log.scanResult === 'valid')?.scannedAt || null,
    }));
  });

  // 4. Supervisor Cancel Booking (Must be before boarding + 5-hour departure limit + Refund)
  fastify.post('/api/supervisor/cancel-booking', {
    preValidation: [(fastify as any).authenticate, requireRole(['supervisor', 'admin'])],
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

    // 1. Pre-boarding check: Must happen before boarding!
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

    // 2. 5-Hour Cutoff Limit: At least 5 hours difference before trip departure time
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

    // 3. Process Refund & Status Update
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

    // 4. Audit Log for Refund
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

    // 5. Synchronized Real-Time WebSocket Notifications
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

    // Instant direct notification to the student
    WebSocketHub.sendToUser(booking.userId, cancellationNotice);

    // Free the seat on the live trip room seat map
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

    // If paired booking exists for a round trip, cancel it with refund as well
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
      }
    }

    return {
      success: true,
      message: 'Booking cancelled successfully with full refund.',
      messageAr: 'تم إلغاء الحجز بنجاح وإصدار أمر استرداد كامل للمبلغ (160 ج.م).',
      refundStatus: 'refunded',
      refundAmount: 160,
      boardingCode,
    };
  });
}

