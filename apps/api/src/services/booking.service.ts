import { CreateBookingSchema, CreateRoundTripBookingSchema, SwapBookingSchema, QRCodec, generateBoardingCode } from '@bus-aesh/shared';
import type { Actor } from '@bus-aesh/shared';
import type { z } from 'zod';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { EmailOutboxService } from './email-outbox.service.js';
import { withIdempotency } from './idempotency.service.js';
import { randomBytes, randomUUID } from 'node:crypto';
const jwtSecret = process.env.JWT_SECRET || '';
const QR_EXPIRY_HOURS = 24;
function getQrExpiresAt(departureTime: Date): Date {
    return new Date(departureTime.getTime() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
}
function generatePaymentId(): string {
    return `TXN-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}
function generateBookingRef(): string {
    return `GU-${randomBytes(5).toString('hex').toUpperCase()}`;
}
export async function createBooking(actor: Actor, rawInput: z.infer<typeof CreateBookingSchema>, key?: string) {
    const input = CreateBookingSchema.parse(rawInput);
    if (input.paymentMethod === 'visa_mock' && process.env.ENABLE_MOCK_PAYMENTS !== 'true')
        throw new Error('MOCK_PAYMENTS_DISABLED');
    if (input.paymentMethod === 'none' && input.bookingType !== 'one_way')
        throw new Error('PAYMENT_METHOD_UNAVAILABLE');
    const { tripId, seatNumber, paymentMethod, bookingType, legType, receiptImage, receiptRef } = input;
    const userId = actor.userId;
    return withIdempotency(actor, "createBooking", input, key, async (tx) => {
        await lockSeats(tx, [[tripId, seatNumber]]);
        // Check seat conflict
        const conflict = await tx.query.bookings.findFirst({
            where: and(eq(schema.bookings.tripId, tripId), eq(schema.bookings.seatNumber, seatNumber), inArray(schema.bookings.status, ['confirmed', 'swapped'])),
        });
        if (conflict) {
            throw new Error('SEAT_ALREADY_BOOKED');
        }
        const trip = await tx.query.trips.findFirst({
            where: eq(schema.trips.id, tripId),
            with: {
                route: true, bus: true
            },
        });
        if (!trip) {
            throw new Error('Trip not found');
        }
        if (seatNumber < 1 || seatNumber > Math.min(trip.totalSeats, trip.bus?.totalSeats ?? trip.totalSeats))
            throw new Error('INVALID_SEAT_NUMBER');
        if (paymentMethod === 'none' && Number(trip.priceEgp) !== 0) {
            throw new Error('PAYMENT_REQUIRED');
        }
        if (Number(trip.priceEgp) > 0 && !receiptRef?.trim() && !receiptImage?.trim() && paymentMethod !== 'visa_mock') {
            throw new Error('Receipt evidence is required for paid trips');
        }
        const paymentStatus = Number(trip.priceEgp) === 0 || paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded';
        const qrExpiresAt = getQrExpiresAt(trip.departureTime);
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
            .set({
            qrToken
        })
            .where(eq(schema.bookings.id, booking.id));
        if (paymentStatus === 'paid') {
            await EmailOutboxService.enqueueBookingConfirmation(tx, [booking.id]);
        }
        await tx.insert(schema.auditLogs).values({
            userId, action: 'BOOKING_CREATED', entityType: 'booking', entityId: booking.id
        });
        return {
            booking, trip, qrToken, paymentId
        };
    });
}
export async function createRoundTripBooking(actor: Actor, rawInput: z.infer<typeof CreateRoundTripBookingSchema>, key?: string) {
    const input = CreateRoundTripBookingSchema.parse(rawInput);
    if (input.paymentMethod === 'visa_mock' && process.env.ENABLE_MOCK_PAYMENTS !== 'true')
        throw new Error('MOCK_PAYMENTS_DISABLED');
    if (input.toCampusTripId === input.fromCampusTripId)
        throw new Error('ROUND_TRIP_SAME_TRIP');
    const { toCampusTripId, toCampusSeatNumber, fromCampusTripId, fromCampusSeatNumber, paymentMethod, receiptImage, receiptRef } = input;
    const userId = actor.userId;
    return withIdempotency(actor, "createRoundTripBooking", input, key, async (tx) => {
        await lockSeats(tx, [[toCampusTripId, toCampusSeatNumber], [fromCampusTripId, fromCampusSeatNumber]]);
        const toCampusTrip = await tx.query.trips.findFirst({
            where: eq(schema.trips.id, toCampusTripId),
            with: {
                route: true, bus: true
            },
        });
        const fromCampusTrip = await tx.query.trips.findFirst({
            where: eq(schema.trips.id, fromCampusTripId),
            with: {
                route: true, bus: true
            },
        });
        if (!toCampusTrip)
            throw new Error('To-campus trip not found');
        if (!fromCampusTrip)
            throw new Error('From-campus trip not found');
        if (toCampusSeatNumber > Math.min(toCampusTrip.totalSeats, toCampusTrip.bus?.totalSeats ?? toCampusTrip.totalSeats) || fromCampusSeatNumber > Math.min(fromCampusTrip.totalSeats, fromCampusTrip.bus?.totalSeats ?? fromCampusTrip.totalSeats))
            throw new Error('INVALID_SEAT_NUMBER');
        if ((Number(toCampusTrip.priceEgp) > 0 || Number(fromCampusTrip.priceEgp) > 0) && !receiptRef?.trim() && !receiptImage?.trim() && paymentMethod !== 'visa_mock') {
            throw new Error('Receipt evidence is required for paid trips');
        }
        // Advisory seat locks serialize creators; avoid row locks that invert swap lock order.
        const toCampusConflict = await tx.query.bookings.findFirst({
            where: and(eq(schema.bookings.tripId, toCampusTripId), eq(schema.bookings.seatNumber, toCampusSeatNumber), inArray(schema.bookings.status, ['confirmed', 'swapped'])),
        });
        if (toCampusConflict) {
            throw new Error('SEAT_ALREADY_BOOKED');
        }
        const fromCampusConflict = await tx.query.bookings.findFirst({
            where: and(eq(schema.bookings.tripId, fromCampusTripId), eq(schema.bookings.seatNumber, fromCampusSeatNumber), inArray(schema.bookings.status, ['confirmed', 'swapped'])),
        });
        if (fromCampusConflict) {
            throw new Error('SEAT_ALREADY_BOOKED');
        }
        const paymentStatus = (Number(toCampusTrip.priceEgp) === 0 && Number(fromCampusTrip.priceEgp) === 0) || paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded';
        const paymentId = generatePaymentId();
        const bookingRef = generateBookingRef();
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
            qrExpiresAt: getQrExpiresAt(toCampusTrip.departureTime),
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
            qrExpiresAt: getQrExpiresAt(fromCampusTrip.departureTime),
        }).returning();
        await tx.update(schema.bookings)
            .set({
            pairedBookingId: returnBooking.id
        })
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
        await tx.update(schema.bookings).set({
            qrToken: arrivalQR
        }).where(eq(schema.bookings.id, arrivalBooking.id));
        await tx.update(schema.bookings).set({
            qrToken: returnQR
        }).where(eq(schema.bookings.id, returnBooking.id));
        if (paymentStatus === 'paid') {
            await EmailOutboxService.enqueueBookingConfirmation(tx, [arrivalBooking.id, returnBooking.id]);
        }
        await tx.insert(schema.auditLogs).values({
            userId, action: 'ROUND_TRIP_CREATED', entityType: 'booking', entityId: arrivalBooking.id
        });
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
}
async function lockSeats(tx: import('./idempotency.service.js').Transaction, seats: number[][]) {
    for (const [tripId, seat] of seats.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
        await tx.execute(sql `SELECT pg_advisory_xact_lock(hashtextextended(${`seat:${tripId}:${seat}`},0))`);
    }
}
export async function swapBooking(actor: Actor, rawInput: z.infer<typeof SwapBookingSchema>, key?: string) {
    if (!['supervisor', 'admin'].includes(actor.role))
        throw new Error('FORBIDDEN');
    const input = SwapBookingSchema.parse(rawInput);
    const { bookingId, targetTripId, targetSeatNumber, reason } = input;
    const supervisorId = actor.userId;
    return withIdempotency(actor, 'swapBooking', input, key, async (tx) => {
        await tx.execute(sql `SELECT id FROM bookings WHERE id=${bookingId} FOR UPDATE`);
        const oldBooking = await tx.query.bookings.findFirst({
            where: eq(schema.bookings.id, bookingId),
            with: {
                trip: {
                    with: {
                        route: true
                    }
                },
            },
        });
        if (!oldBooking) {
            throw new Error('Booking not found');
        }
        await lockSeats(tx, [[targetTripId, targetSeatNumber]]);
        const targetConflict = await tx.query.bookings.findFirst({
            where: and(eq(schema.bookings.tripId, targetTripId), eq(schema.bookings.seatNumber, targetSeatNumber), inArray(schema.bookings.status, ['confirmed', 'swapped'])),
        });
        if (targetConflict) {
            throw new Error('SEAT_ALREADY_BOOKED');
        }
        const targetTrip = await tx.query.trips.findFirst({
            where: eq(schema.trips.id, targetTripId),
            with: {
                route: true, bus: true
            },
        });
        if (!targetTrip) {
            throw new Error('Target trip not found');
        }
        if (targetSeatNumber > Math.min(targetTrip.totalSeats, targetTrip.bus?.totalSeats ?? targetTrip.totalSeats))
            throw new Error('INVALID_SEAT_NUMBER');
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
        await tx.update(schema.bookings)
            .set({
            tripId: targetTripId,
            seatNumber: targetSeatNumber,
            qrToken: newQrToken,
            qrVersion: newQrVersion,
            qrExpiresAt: getQrExpiresAt(targetTrip.departureTime),
            qrUsedAt: null,
            status: 'swapped',
            updatedAt: new Date(),
        })
            .where(eq(schema.bookings.id, bookingId));
        const [swapLog] = await tx.insert(schema.swapLogs).values({
            oldBookingId: bookingId,
            newBookingId: bookingId,
            performedBy: supervisorId,
            reason: reason || 'Operational seat swap',
            oldTripId,
            oldSeatNumber,
            newTripId: targetTripId,
            newSeatNumber: targetSeatNumber,
        }).returning({
            id: schema.swapLogs.id
        });
        await EmailOutboxService.enqueueSwapNotification(tx, swapLog.id);
        await tx.insert(schema.auditLogs).values({
            userId: supervisorId, action: 'BOOKING_SWAPPED', entityType: 'booking', entityId: bookingId
        });
        return {
            oldBooking: {
                tripId: oldBooking.tripId
            }, newQrToken, oldTripId, oldSeatNumber
        };
    });
}
