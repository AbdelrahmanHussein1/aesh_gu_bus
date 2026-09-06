import { FastifyInstance } from 'fastify';
import { SwapBookingSchema, VerifyScanSchema, QRCodec } from '@bus-aesh/shared';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';
import { EmailService } from '../services/email.service.js';

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
      return reply.status(400).send({ error: bodyResult.error.format() });
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
      return reply.status(400).send({ error: bodyResult.error.format() });
    }

    const { token, expectedLegType, latitude, longitude, deviceInfo } = bodyResult.data;
    const scannerId = request.user.id;

    const isSignatureValid = QRCodec.verify(token, jwtSecret);
    if (!isSignatureValid) {
      return { success: false, result: 'invalid', message: 'Verification Failed: Tampered or invalid signature' };
    }

    const payload = QRCodec.decode(token);

    const booking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, payload.bookingId),
      with: {
        user: true,
        trip: { with: { route: true, bus: true } },
      },
    });

    if (!booking) {
      return { success: false, result: 'invalid', message: 'No active booking record found' };
    }

    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return { success: false, result: 'invalid', message: `Booking is ${booking.status}. QR code is no longer valid.` };
    }

    if (booking.qrExpiresAt && new Date() > new Date(booking.qrExpiresAt)) {
      return { success: false, result: 'expired', message: 'QR code has expired (24-hour window passed).' };
    }

    if (booking.qrUsedAt) {
      return {
        success: false,
        result: 'already_checked_in',
        message: `QR already used at ${new Date(booking.qrUsedAt).toLocaleTimeString()}`,
        riderName: booking.user.fullName,
        seatNumber: booking.seatNumber,
      };
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

    WebSocketHub.broadcastToTripRoom(booking.tripId, {
      type: 'rider_boarded',
      bookingId: booking.id,
      riderName: booking.user.fullName,
      seatNumber: booking.seatNumber,
      legType: booking.legType,
      scannedAt: new Date(),
    });

    return {
      success: true,
      result: 'valid',
      riderName: booking.user.fullName,
      seatNumber: booking.seatNumber,
      route: booking.trip.route.nameEn,
      bus: booking.trip.bus.name,
      legType: booking.legType,
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
      isBoarded: b.boardingLogs.some(log => log.scanResult === 'valid'),
      boardedAt: b.boardingLogs.find(log => log.scanResult === 'valid')?.scannedAt || null,
    }));
  });
}
