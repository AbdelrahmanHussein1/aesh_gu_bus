import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { redis } from './redis.js';
import { authenticateOdoo } from './auth/odoo.js';
import { 
  LoginSchema, 
  RegisterSchema,
  CreateBookingSchema, 
  CreateRoundTripBookingSchema,
  CancelBookingSchema, 
  SwapBookingSchema, 
  VerifyScanSchema, 
  QRCodec 
} from '@bus-aesh/shared';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { Resend } from 'resend';

dotenv.config();

const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';
const jwtSecret = process.env.JWT_SECRET || 'super-secret-aesh-key';
const resendApiKey = process.env.RESEND_API_KEY || 're_mock_key';
const emailFrom = process.env.EMAIL_FROM || 'Bus Aesh <onboarding@resend.dev>';
const sandboxOverrideRecipient = process.env.SANDBOX_OVERRIDE_RECIPIENT || 'abdulrahman.ehab.hussein@gmail.com';
const QR_EXPIRY_HOURS = 24;

const resend = new Resend(resendApiKey);

const fastify = Fastify({
  logger: true
});

// Configure Plugins
await fastify.register(cors, {
  origin: true, // Allow all origins for dev/testing
  credentials: true
});

await fastify.register(jwt, {
  secret: jwtSecret
});

await fastify.register(websocket);

// Authentication Middleware — FIXED: returns reply to halt execution
fastify.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Helper: Check Role permissions — FIXED: returns reply to halt execution
const requireRole = (roles: string[]) => async (request: any, reply: any) => {
  const user = request.user;
  if (!user || !roles.includes(user.role)) {
    return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
  }
};

// WebSocket connection mapping: tripId -> Set of sockets
const tripRooms = new Map<number, Set<any>>();

// --- HELPER FUNCTIONS ---

/** Check if a seat is already booked (confirmed/swapped) on a given trip */
async function checkSeatConflict(tripId: number, seatNumber: number) {
  return db.query.bookings.findFirst({
    where: and(
      eq(schema.bookings.tripId, tripId),
      eq(schema.bookings.seatNumber, seatNumber),
      inArray(schema.bookings.status, ['confirmed', 'swapped'])
    ),
  });
}

/** Broadcast a message to all WebSocket clients in a trip room, cleaning up dead sockets */
function broadcastToTripRoom(tripId: number, message: any) {
  const room = tripRooms.get(tripId);
  if (!room) return;
  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    } else {
      // Clean up dead sockets
      room.delete(client);
    }
  }
  if (room.size === 0) {
    tripRooms.delete(tripId);
  }
}

/** Calculate QR expiration timestamp (24h from now) */
function getQrExpiresAt(): Date {
  return new Date(Date.now() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
}

/** Generate payment transaction ID */
function generatePaymentId(): string {
  return `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

// --- ROUTES ---

// Health Check
fastify.get('/health', async () => {
  return { status: 'OK', time: new Date() };
});

// 1. User Registration (For Mock/Test Accounts)
fastify.post('/api/auth/register', async (request, reply) => {
  const bodyResult = RegisterSchema.safeParse(request.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: bodyResult.error.format() });
  }

  const { email, fullName, role, password } = bodyResult.data;

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    const getDeterministicId = (str: string, seed: number) => {
      let hash = seed;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash % 10000000);
    };

    const erpUid = getDeterministicId(email, 10000);
    const erpPartnerId = getDeterministicId(email, 20000);

    const [newUser] = await db.insert(schema.users).values({
      email,
      fullName,
      role,
      password,
      erpUid,
      erpPartnerId,
    }).returning();

    return { success: true, user: newUser };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: error.message || 'Database error during registration' });
  }
});

// 1.2. Forgot Password Endpoint
fastify.post('/api/auth/forgot-password', async (request, reply) => {
  const { email } = request.body as { email: string };
  if (!email) {
    return reply.status(400).send({ error: 'Email address is required' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      return reply.status(404).send({ error: 'No user registered with this email address' });
    }

    // Generate a random 6-character alphanumeric temp password
    const tempPassword = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Update password in DB
    await db.update(schema.users)
      .set({ password: tempPassword })
      .where(eq(schema.users.id, user.id));

    // Send reset email
    await sendForgotPasswordEmail(user.email, user.fullName, tempPassword);

    return { success: true, message: 'Temporary password sent to email.' };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: error.message || 'Database error during password reset' });
  }
});

// 1.5. Authentication Login
fastify.post('/api/auth/login', async (request, reply) => {
  const bodyResult = LoginSchema.safeParse(request.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: bodyResult.error.format() });
  }

  const { email, password } = bodyResult.data;

  try {
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (user) {
      if (user.password && user.password !== password) {
        return reply.status(401).send({ error: 'Invalid password' });
      }
    } else {
      const erpUser = await authenticateOdoo(email, password);

      let role = 'rider';
      if (email === 'admin@gu.edu.eg') role = 'admin';
      else if (email.startsWith('supervisor') || email === 'supervisor@gu.edu.eg') role = 'supervisor';

      const [newUser] = await db.insert(schema.users).values({
        email,
        fullName: erpUser.name,
        role,
        erpUid: erpUser.uid,
        erpPartnerId: erpUser.partner_id,
      }).returning();
      user = newUser;
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    }, { expiresIn: '30d' });

    return { token, user };
  } catch (error: any) {
    return reply.status(401).send({ error: error.message || 'Login failed' });
  }
});

// 2. Fetch routes and stops
fastify.get('/api/routes', async () => {
  const allRoutes = await db.query.routes.findMany({
    where: eq(schema.routes.isActive, true),
    with: {
      stops: true,
    },
  });
  return allRoutes;
});

// 3. Fetch active trips by date, route, direction, and optional time slot
fastify.get('/api/trips', async (request, reply) => {
  const { date, routeId, direction, timeSlot } = request.query as {
    date?: string;
    routeId?: string;
    direction?: string;
    timeSlot?: string;
  };
  if (!date) {
    return reply.status(400).send({ error: 'Missing date query parameter' });
  }

  // Build dynamic filters
  const conditions = [
    eq(schema.trips.tripDate, date),
  ];
  if (routeId && routeId !== 'all') {
    const rid = parseInt(routeId);
    if (!isNaN(rid)) {
      conditions.push(eq(schema.trips.routeId, rid));
    }
  }
  if (direction && (direction === 'to_campus' || direction === 'from_campus')) {
    conditions.push(eq(schema.trips.direction, direction));
  }
  if (timeSlot && timeSlot !== 'all') {
    conditions.push(eq(schema.trips.timeSlot, timeSlot));
  }

  const activeTrips = await db.query.trips.findMany({
    where: and(...conditions),
    with: {
      bus: true,
      route: true,
      driver: true,
      supervisors: {
        with: {
          user: true,
        },
      },
    },
  });

  return activeTrips.map(t => ({
    id: t.id,
    routeId: t.routeId,
    tripDate: t.tripDate,
    departureTime: t.departureTime,
    returnTime: t.returnTime,
    direction: t.direction,
    timeSlot: t.timeSlot,
    totalSeats: t.totalSeats,
    priceEgp: Number(t.priceEgp),
    status: t.status,
    cancellationLockHours: t.cancellationLockHours,
    bus: t.bus,
    route: t.route,
    driver: t.driver ? {
      nameAr: t.driver.fullNameAr || t.driver.fullName,
      nameEn: t.driver.fullName,
      phone: t.driver.phone || '',
    } : null,
    supervisors: t.supervisors?.map((s: any) => ({
      nameAr: s.user.fullNameAr || s.user.fullName,
      nameEn: s.user.fullName,
      phone: s.user.phone || '',
    })) || [],
  }));
});

// 4. Fetch live seat map for a trip — FIXED: uses dynamic seat count, strips userId for unauth
fastify.get('/api/trips/:tripId/seats', async (request, reply) => {
  const { tripId } = request.params as { tripId: string };
  const id = parseInt(tripId);
  if (isNaN(id)) {
    return reply.status(400).send({ error: 'Invalid tripId' });
  }

  // Fetch trip to get actual seat count
  const trip = await db.query.trips.findFirst({
    where: eq(schema.trips.id, id),
    with: { bus: true },
  });
  if (!trip) {
    return reply.status(404).send({ error: 'Trip not found' });
  }

  const totalSeats = trip.bus?.totalSeats || trip.totalSeats;

  // Get confirmed bookings
  const confirmedBookings = await db.query.bookings.findMany({
    where: and(
      eq(schema.bookings.tripId, id),
      inArray(schema.bookings.status, ['confirmed', 'swapped'])
    ),
  });

  // Query Redis for held seats
  const lockKeys = Array.from({ length: totalSeats }, (_, i) => `seat_lock:${id}:${i + 1}`);
  const locks = await redis.mget(...lockKeys);

  const seatMap = Array.from({ length: totalSeats }, (_, i) => {
    const seatNumber = i + 1;
    const booking = confirmedBookings.find(b => b.seatNumber === seatNumber);
    const lockHolder = locks[i];

    if (booking) {
      // Don't leak userId to unauthenticated users
      return { seatNumber, status: 'booked' };
    } else if (lockHolder) {
      return { seatNumber, status: 'held' };
    } else {
      return { seatNumber, status: 'free' };
    }
  });

  return seatMap;
});

// 5. Lock/Select a seat (Redis TTL lock)
fastify.post('/api/trips/:tripId/seats/:seatNumber/lock', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  const { tripId, seatNumber } = request.params as { tripId: string; seatNumber: string };
  const userId = request.user.id;
  const tid = parseInt(tripId);
  const sn = parseInt(seatNumber);

  if (isNaN(tid) || isNaN(sn)) {
    return reply.status(400).send({ error: 'Invalid tripId or seatNumber' });
  }

  // Check if already booked
  const existing = await checkSeatConflict(tid, sn);
  if (existing) {
    return reply.status(400).send({ error: 'Seat already booked' });
  }

  // Atomic setnx with 5-minute expiry (300 seconds)
  const lockKey = `seat_lock:${tid}:${sn}`;
  const acquired = await (redis as any).set(lockKey, String(userId), 'NX', 'EX', 300);

  if (acquired === 'OK') {
    broadcastToTripRoom(tid, {
      type: 'seat_locked',
      tripId: tid,
      seatNumber: sn,
      expiresAt: Date.now() + 300000,
    });
    return { success: true, expiresAt: Date.now() + 300000 };
  } else {
    return reply.status(409).send({ error: 'Seat is currently held by another user' });
  }
});

// 6. Unlock/Deselect a seat
fastify.post('/api/trips/:tripId/seats/:seatNumber/unlock', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
  const { tripId, seatNumber } = request.params as { tripId: string; seatNumber: string };
  const userId = request.user.id;
  const tid = parseInt(tripId);
  const sn = parseInt(seatNumber);

  if (isNaN(tid) || isNaN(sn)) {
    return reply.status(400).send({ error: 'Invalid tripId or seatNumber' });
  }

  const lockKey = `seat_lock:${tid}:${sn}`;
  const holder = await redis.get(lockKey);

  if (holder === String(userId)) {
    await redis.del(lockKey);
    broadcastToTripRoom(tid, {
      type: 'seat_unlocked',
      tripId: tid,
      seatNumber: sn,
    });
    return { success: true };
  } else {
    return reply.status(403).send({ error: 'You do not own this seat lock' });
  }
});

// 7. Complete one-way booking & checkout
fastify.post('/api/bookings', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
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
      // 1. Lock/Check seat conflict within transaction
      const conflict = await tx.query.bookings.findFirst({
        where: and(
          eq(schema.bookings.tripId, tripId),
          eq(schema.bookings.seatNumber, seatNumber),
          inArray(schema.bookings.status, ['confirmed', 'swapped'])
        ),
      });
      if (conflict) {
        throw new Error('Seat has already been sold');
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

      // Create QR token with leg type
      const qrToken = QRCodec.encode({
        bookingId: booking.id,
        tripId,
        seatNumber,
        date: trip.tripDate,
        version: 1,
        legType: legType as 'to_campus' | 'from_campus',
      }, jwtSecret);

      // Update DB with generated token
      await tx.update(schema.bookings)
        .set({ qrToken })
        .where(eq(schema.bookings.id, booking.id));

      return { booking, trip, qrToken, paymentId };
    });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Booking transaction failed' });
  }

  const { booking, trip, qrToken } = bookingResult;

  // Release Redis seat lock
  await redis.del(`seat_lock:${tripId}:${seatNumber}`);

  // Broadcast seat purchase
  broadcastToTripRoom(tripId, {
    type: 'seat_booked',
    tripId,
    seatNumber,
  });

  // Send email confirmation
  sendEmailConfirmation(userEmail, userName, trip, seatNumber, qrToken, legType, bookingType, booking.paymentId!).catch(err => {
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

// 7.1. Complete round-trip booking (creates two linked bookings)
fastify.post('/api/bookings/round-trip', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
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
      // Validate both trips exist
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

      // Check seat conflicts for both legs inside transaction
      const toCampusConflict = await tx.query.bookings.findFirst({
        where: and(
          eq(schema.bookings.tripId, toCampusTripId),
          eq(schema.bookings.seatNumber, toCampusSeatNumber),
          inArray(schema.bookings.status, ['confirmed', 'swapped'])
        ),
      });
      if (toCampusConflict) {
        throw new Error(`Seat ${toCampusSeatNumber} on arrival trip is already sold`);
      }

      const fromCampusConflict = await tx.query.bookings.findFirst({
        where: and(
          eq(schema.bookings.tripId, fromCampusTripId),
          eq(schema.bookings.seatNumber, fromCampusSeatNumber),
          inArray(schema.bookings.status, ['confirmed', 'swapped'])
        ),
      });
      if (fromCampusConflict) {
        throw new Error(`Seat ${fromCampusSeatNumber} on return trip is already sold`);
      }

      const paymentStatus = paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded';
      const paymentId = generatePaymentId();
      const qrExpiresAt = getQrExpiresAt();

      // Create arrival booking
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

      // Create return booking
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

      // Link arrival booking to return booking
      await tx.update(schema.bookings)
        .set({ pairedBookingId: returnBooking.id })
        .where(eq(schema.bookings.id, arrivalBooking.id));

      // Generate QR tokens for both legs
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

      // Update both bookings with QR tokens
      await tx.update(schema.bookings)
        .set({ qrToken: arrivalQR })
        .where(eq(schema.bookings.id, arrivalBooking.id));

      await tx.update(schema.bookings)
        .set({ qrToken: returnQR })
        .where(eq(schema.bookings.id, returnBooking.id));

      return {
        arrivalBooking,
        returnBooking,
        arrivalQR,
        returnQR,
        toCampusTrip,
        fromCampusTrip,
        paymentId,
      };
    });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Round-trip booking transaction failed' });
  }

  const {
    arrivalBooking,
    returnBooking,
    arrivalQR,
    returnQR,
    toCampusTrip,
    fromCampusTrip,
    paymentId,
  } = roundTripResult;

  // Release Redis locks for both seats
  await redis.del(`seat_lock:${toCampusTripId}:${toCampusSeatNumber}`);
  await redis.del(`seat_lock:${fromCampusTripId}:${fromCampusSeatNumber}`);

  // Broadcast seat purchases to both trip rooms
  broadcastToTripRoom(toCampusTripId, { type: 'seat_booked', tripId: toCampusTripId, seatNumber: toCampusSeatNumber });
  broadcastToTripRoom(fromCampusTripId, { type: 'seat_booked', tripId: fromCampusTripId, seatNumber: fromCampusSeatNumber });

  // Send combined round-trip email
  sendRoundTripEmailConfirmation(
    userEmail, userName,
    toCampusTrip, toCampusSeatNumber, arrivalQR,
    fromCampusTrip, fromCampusSeatNumber, returnQR,
    paymentId, paymentMethod
  ).catch(err => {
    console.error('Failed to send round-trip confirmation email:', err);
  });

  return {
    success: true,
    arrivalBookingId: arrivalBooking.id,
    returnBookingId: returnBooking.id,
    arrivalQrToken: arrivalQR,
    returnQrToken: returnQR,
    seatNumber: toCampusSeatNumber, // Same seat for both legs
  };
});

// 7.5. Fetch current user bookings
fastify.get('/api/bookings/my', { preValidation: [(fastify as any).authenticate] }, async (request: any) => {
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
        }
      }
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

// 8. Cancel booking — also cancels paired booking for round trips
fastify.post('/api/bookings/cancel', { preValidation: [(fastify as any).authenticate] }, async (request: any, reply) => {
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

  // Restrict to riders only (supervisors cannot cancel tickets)
  if (userRole !== 'rider') {
    return reply.status(403).send({ error: 'Supervisors and administrators cannot cancel tickets' });
  }

  // Riders can only cancel their own booking
  if (booking.userId !== userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  // Validate cancellation lock window
  if (userRole === 'rider') {
    const departure = new Date(booking.trip.departureTime);
    const limitMs = booking.trip.cancellationLockHours * 60 * 60 * 1000;
    if (Date.now() > departure.getTime() - limitMs) {
      return reply.status(400).send({ 
        error: `Cancellation locked. Bookings cannot be cancelled within ${booking.trip.cancellationLockHours} hours of departure.` 
      });
    }
  }

  // Cancel this booking
  const cancelData = {
    status: 'cancelled' as const,
    cancelledAt: new Date(),
    cancelReason: reason || 'Cancelled by user',
  };

  await db.update(schema.bookings)
    .set(cancelData)
    .where(eq(schema.bookings.id, bookingId));

  // Broadcast seat release
  broadcastToTripRoom(booking.tripId, {
    type: 'seat_unlocked',
    tripId: booking.tripId,
    seatNumber: booking.seatNumber,
  });
  broadcastToTripRoom(booking.tripId, {
    type: 'booking_cancelled',
    bookingId: booking.id,
    seatNumber: booking.seatNumber,
  });

  // Also cancel paired booking for round trips
  if (booking.pairedBookingId) {
    const pairedBooking = await db.query.bookings.findFirst({
      where: eq(schema.bookings.id, booking.pairedBookingId),
    });
    if (pairedBooking && pairedBooking.status !== 'cancelled') {
      await db.update(schema.bookings)
        .set({ ...cancelData, cancelReason: `Paired booking cancelled: ${reason || 'Cancelled by user'}` })
        .where(eq(schema.bookings.id, booking.pairedBookingId));

      broadcastToTripRoom(pairedBooking.tripId, {
        type: 'seat_unlocked',
        tripId: pairedBooking.tripId,
        seatNumber: pairedBooking.seatNumber,
      });
      broadcastToTripRoom(pairedBooking.tripId, {
        type: 'booking_cancelled',
        bookingId: pairedBooking.id,
        seatNumber: pairedBooking.seatNumber,
      });
    }
  }

  return { success: true };
});

// 9. Swap / Reassign Booking (Supervisors/Admins only)
fastify.post('/api/bookings/swap', { 
  preValidation: [(fastify as any).authenticate, requireRole(['supervisor', 'admin'])] 
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

  // Check target seat availability
  const targetConflict = await checkSeatConflict(targetTripId, targetSeatNumber);
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

  // Track old values for swap log
  const oldTripId = oldBooking.tripId;
  const oldSeatNumber = oldBooking.seatNumber;

  // Update booking with new details and invalidate old QR
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
      qrExpiresAt: getQrExpiresAt(), // Reset expiry on swap
      qrUsedAt: null, // Reset used flag
      status: 'swapped',
      updatedAt: new Date(),
    })
    .where(eq(schema.bookings.id, bookingId));

  // Log swap with old/new details
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

  // Broadcast updates
  broadcastToTripRoom(oldTripId, {
    type: 'seat_unlocked',
    tripId: oldTripId,
    seatNumber: oldSeatNumber,
  });

  broadcastToTripRoom(targetTripId, {
    type: 'seat_booked',
    tripId: targetTripId,
    seatNumber: targetSeatNumber,
  });

  // Notify rider
  sendSwapNotificationEmail(oldBooking.user.email, oldBooking.user.fullName, oldBooking.trip, targetTrip, targetSeatNumber, newQrToken).catch(err => {
    console.error('Swap email notification failed:', err.message);
  });

  return { success: true, newQrToken };
});

// 10. Scan QR Code & Verify Attendance (Supervisor only)
fastify.post('/api/scan/verify', {
  preValidation: [(fastify as any).authenticate, requireRole(['supervisor'])]
}, async (request: any, reply) => {
  const bodyResult = VerifyScanSchema.safeParse(request.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: bodyResult.error.format() });
  }

  const { token, expectedLegType, latitude, longitude, deviceInfo } = bodyResult.data;
  const scannerId = request.user.id;

  // 1. Verify cryptographic signature
  const isSignatureValid = QRCodec.verify(token, jwtSecret);
  if (!isSignatureValid) {
    return { success: false, result: 'invalid', message: 'Verification Failed: Tampered or invalid signature' };
  }

  // 2. Decode payload fields
  const payload = QRCodec.decode(token);

  // 3. Find matching booking
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

  // 4. Check booking status — FIXED: reject cancelled/no_show bookings
  if (booking.status === 'cancelled' || booking.status === 'no_show') {
    return { success: false, result: 'invalid', message: `Booking is ${booking.status}. QR code is no longer valid.` };
  }

  // 5. Check if QR has expired (24h rule)
  if (booking.qrExpiresAt && new Date() > new Date(booking.qrExpiresAt)) {
    return { success: false, result: 'expired', message: 'QR code has expired (24-hour window passed).' };
  }

  // 6. Check if QR was already used (single-use)
  if (booking.qrUsedAt) {
    return { 
      success: false, 
      result: 'already_checked_in', 
      message: `QR already used at ${new Date(booking.qrUsedAt).toLocaleTimeString()}`,
      riderName: booking.user.fullName,
      seatNumber: booking.seatNumber
    };
  }

  // 7. Check if barcode version matches (i.e. if swapped)
  if (booking.qrVersion !== payload.version) {
    return { success: false, result: 'expired', message: 'This QR code is expired. The rider has been assigned a newer seat.' };
  }

  // 8. Validate leg type — the QR must match the leg being scanned
  if (expectedLegType && payload.legType !== expectedLegType) {
    return {
      success: false,
      result: 'wrong_leg',
      message: `Wrong QR code: This is a ${payload.legType === 'to_campus' ? 'University' : 'Return'} QR, but scanning for ${expectedLegType === 'to_campus' ? 'University' : 'Return'} leg.`,
      riderName: booking.user.fullName,
      seatNumber: booking.seatNumber,
    };
  }

  // 9. Mark QR as used
  await db.update(schema.bookings)
    .set({ qrUsedAt: new Date() })
    .where(eq(schema.bookings.id, booking.id));

  // 10. Record Boarding Log entry
  await db.insert(schema.boardingLogs).values({
    bookingId: booking.id,
    scannedBy: scannerId,
    scanResult: 'valid',
    deviceInfo,
    latitude: latitude ? String(latitude) : undefined,
    longitude: longitude ? String(longitude) : undefined,
  });

  // Broadcast live boarding event
  broadcastToTripRoom(booking.tripId, {
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

// 11. Fetch passenger manifest for Supervisor operations — FIXED: filter out cancelled
fastify.get('/api/trips/:tripId/manifest', {
  preValidation: [(fastify as any).authenticate, requireRole(['supervisor', 'admin'])]
}, async (request, reply) => {
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

// 12. WebSocket Seat Lock Synchronization — FIXED: error handling, dead socket cleanup
fastify.route({
  method: 'GET',
  url: '/ws/trips/:tripId/seats',
  wsHandler: (connection, req) => {
    const tripId = parseInt((req.params as any).tripId);
    const socket = (connection as any).socket || connection;
    if (isNaN(tripId)) {
      socket.close();
      return;
    }

    // Join Room
    if (!tripRooms.has(tripId)) {
      tripRooms.set(tripId, new Set());
    }
    tripRooms.get(tripId)!.add(socket);

    console.log(`[WebSocket] Client joined trip room: ${tripId}. Active connections: ${tripRooms.get(tripId)!.size}`);

    const cleanup = () => {
      const room = tripRooms.get(tripId);
      if (room) {
        room.delete(socket);
        if (room.size === 0) {
          tripRooms.delete(tripId);
        }
        console.log(`[WebSocket] Client left room: ${tripId}. Active connections remaining: ${room?.size || 0}`);
      }
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  },
  handler: (request, reply) => {
    reply.status(400).send({ error: 'Only WebSocket connections allowed' });
  }
});

// 13. Admin: Fleet Status Overview
fastify.get('/api/admin/fleet', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async () => {
  const routesList = await db.query.routes.findMany({
    where: eq(schema.routes.isActive, true),
    with: {
      trips: {
        with: {
          bus: true,
          driver: true,
          bookings: {
            where: inArray(schema.bookings.status, ['confirmed', 'swapped']),
          },
        },
      },
    },
  });

  return routesList.map(r => {
    const activeTrip = r.trips[0];
    const totalBooked = r.trips.reduce((acc, t) => acc + t.bookings.length, 0);
    const busName = activeTrip?.bus?.name || `${r.nameEn} Bus`;
    const driverName = activeTrip?.driver ? (activeTrip.driver.fullNameAr || activeTrip.driver.fullName) : 'Mohamed Sobhi';
    const driverPhone = activeTrip?.driver?.phone || '01021561196';

    return {
      routeId: r.id,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      busName,
      licensePlate: activeTrip?.bus?.licensePlate || 'أ ب ج 101',
      driverName,
      driverPhone,
      totalTrips: r.trips.length,
      bookedSeats: totalBooked,
      capacity: activeTrip?.bus?.totalSeats || 50,
      status: 'on_schedule',
    };
  });
});

// 14. Admin: Live System Audit Logs
fastify.get('/api/admin/audit-logs', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async () => {
  const logs = await db.query.auditLogs.findMany({
    orderBy: desc(schema.auditLogs.createdAt),
    limit: 100,
    with: {
      user: true,
    },
  });

  return logs.map(l => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    details: typeof l.details === 'string' ? l.details : JSON.stringify(l.details),
    userEmail: l.user?.email || 'system',
    userName: l.user?.fullName || 'System',
    time: l.createdAt,
  }));
});

// 15. Admin: Policy Settings (Get & Update)
fastify.get('/api/admin/settings', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async () => {
  const setting = await db.query.systemSettings.findFirst({
    where: eq(schema.systemSettings.key, 'cancellation_lock_hours'),
  });

  return {
    cancellationLockHours: (setting?.value as any)?.hours ?? 3,
  };
});

fastify.put('/api/admin/settings', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async (request: any, reply) => {
  const { cancellationLockHours } = request.body as { cancellationLockHours?: number };
  if (typeof cancellationLockHours !== 'number' || cancellationLockHours < 1 || cancellationLockHours > 24) {
    return reply.status(400).send({ error: 'cancellationLockHours must be a number between 1 and 24' });
  }

  await db.insert(schema.systemSettings)
    .values({
      key: 'cancellation_lock_hours',
      value: { hours: cancellationLockHours },
      updatedBy: request.user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.systemSettings.key,
      set: {
        value: { hours: cancellationLockHours },
        updatedBy: request.user.id,
        updatedAt: new Date(),
      },
    });

  // Log in audit trail
  await db.insert(schema.auditLogs).values({
    userId: request.user.id,
    action: 'POLICY_UPDATED',
    entityType: 'settings',
    entityId: 'cancellation_lock_hours',
    details: { cancellationLockHours },
  });

  return { success: true, cancellationLockHours };
});

// 16. Admin: Schedule Management (List, Create, Update, Delete, Clone)
fastify.get('/api/admin/schedules', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async (request: any) => {
  const { date, routeId } = request.query as { date?: string; routeId?: string };
  const conditions: any[] = [];
  if (date) conditions.push(eq(schema.trips.tripDate, date));
  if (routeId) {
    const rid = parseInt(routeId);
    if (!isNaN(rid)) conditions.push(eq(schema.trips.routeId, rid));
  }

  const allTrips = await db.query.trips.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      bus: true,
      route: true,
      driver: true,
      supervisors: {
        with: {
          user: true,
        },
      },
    },
    orderBy: [desc(schema.trips.tripDate), schema.trips.departureTime],
  });

  const tripIds = allTrips.map(t => t.id);
  const bookingsCounts = tripIds.length > 0 ? await db.query.bookings.findMany({
    where: and(
      inArray(schema.bookings.tripId, tripIds),
      inArray(schema.bookings.status, ['confirmed', 'swapped'])
    ),
    columns: { tripId: true, id: true },
  }) : [];

  const countMap = new Map<number, number>();
  for (const b of bookingsCounts) {
    countMap.set(b.tripId, (countMap.get(b.tripId) || 0) + 1);
  }

  return allTrips.map(t => ({
    id: t.id,
    routeId: t.routeId,
    tripDate: t.tripDate,
    departureTime: t.departureTime,
    returnTime: t.returnTime,
    direction: t.direction,
    timeSlot: t.timeSlot,
    totalSeats: t.totalSeats,
    bookedSeats: countMap.get(t.id) || 0,
    priceEgp: Number(t.priceEgp),
    status: t.status,
    cancellationLockHours: t.cancellationLockHours,
    bus: t.bus,
    route: t.route,
    driver: t.driver ? {
      id: t.driver.id,
      nameAr: t.driver.fullNameAr || t.driver.fullName,
      nameEn: t.driver.fullName,
      phone: t.driver.phone || '',
    } : null,
    supervisors: t.supervisors?.map((s: any) => ({
      id: s.user.id,
      nameAr: s.user.fullNameAr || s.user.fullName,
      nameEn: s.user.fullName,
      phone: s.user.phone || '',
    })) || [],
  }));
});

// Admin: Get Personnel (Drivers and Supervisors for assignment)
fastify.get('/api/admin/personnel', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async () => {
  const users = await db.query.users.findMany({
    where: inArray(schema.users.role, ['supervisor', 'admin', 'rider']),
    columns: { id: true, fullName: true, fullNameAr: true, email: true, phone: true, role: true },
  });

  return {
    drivers: users.map(u => ({
      id: u.id,
      nameAr: u.fullNameAr || u.fullName,
      nameEn: u.fullName,
      phone: u.phone || '',
    })),
    supervisors: users.map(u => ({
      id: u.id,
      nameAr: u.fullNameAr || u.fullName,
      nameEn: u.fullName,
      phone: u.phone || '',
    })),
  };
});

// Admin: Create Trip / Shift
fastify.post('/api/admin/trips', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async (request: any, reply) => {
  const body = request.body as any;
  const {
    routeId, busId, driverId, supervisorIds,
    tripDate, departureTime, returnTime, direction,
    timeSlot, totalSeats, priceEgp
  } = body;

  if (!routeId || !tripDate || !departureTime) {
    return reply.status(400).send({ error: 'routeId, tripDate, and departureTime are required' });
  }

  let assignedBusId = busId;
  if (!assignedBusId) {
    const firstBus = await db.query.buses.findFirst();
    assignedBusId = firstBus?.id || 1;
  }

  const [newTrip] = await db.insert(schema.trips).values({
    routeId: parseInt(routeId),
    busId: assignedBusId,
    driverId: driverId || null,
    tripDate,
    departureTime: new Date(departureTime),
    returnTime: returnTime ? new Date(returnTime) : null,
    direction: direction || 'to_campus',
    timeSlot: timeSlot || 'morning_1',
    totalSeats: totalSeats ? parseInt(totalSeats) : 50,
    priceEgp: priceEgp ? String(priceEgp) : '160.00',
    status: 'scheduled',
  }).returning();

  if (Array.isArray(supervisorIds) && supervisorIds.length > 0) {
    await db.insert(schema.tripSupervisors).values(
      supervisorIds.map((uid: string) => ({
        tripId: newTrip.id,
        userId: uid,
        assignedRole: 'line_supervisor',
      }))
    );
  }

  await db.insert(schema.auditLogs).values({
    userId: request.user.id,
    action: 'TRIP_CREATED',
    entityType: 'trip',
    entityId: String(newTrip.id),
    details: { tripId: newTrip.id, tripDate, routeId, timeSlot },
  });

  return { success: true, trip: newTrip };
});

// Admin: Update Trip
fastify.put('/api/admin/trips/:id', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const tripId = parseInt(id);
  if (isNaN(tripId)) return reply.status(400).send({ error: 'Invalid trip ID' });

  const body = request.body as any;
  const { driverId, supervisorIds, departureTime, returnTime, status, timeSlot, totalSeats, priceEgp } = body;

  const updateData: any = { updatedAt: new Date() };
  if (driverId !== undefined) updateData.driverId = driverId;
  if (departureTime) updateData.departureTime = new Date(departureTime);
  if (returnTime) updateData.returnTime = new Date(returnTime);
  if (status) updateData.status = status;
  if (timeSlot) updateData.timeSlot = timeSlot;
  if (totalSeats) updateData.totalSeats = parseInt(totalSeats);
  if (priceEgp) updateData.priceEgp = String(priceEgp);

  await db.update(schema.trips).set(updateData).where(eq(schema.trips.id, tripId));

  if (Array.isArray(supervisorIds)) {
    await db.delete(schema.tripSupervisors).where(eq(schema.tripSupervisors.tripId, tripId));
    if (supervisorIds.length > 0) {
      await db.insert(schema.tripSupervisors).values(
        supervisorIds.map((uid: string) => ({
          tripId,
          userId: uid,
          assignedRole: 'line_supervisor',
        }))
      );
    }
  }

  await db.insert(schema.auditLogs).values({
    userId: request.user.id,
    action: 'TRIP_UPDATED',
    entityType: 'trip',
    entityId: String(tripId),
    details: updateData,
  });

  return { success: true };
});

// Admin: Delete / Cancel Trip
fastify.delete('/api/admin/trips/:id', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const tripId = parseInt(id);
  if (isNaN(tripId)) return reply.status(400).send({ error: 'Invalid trip ID' });

  const existingBookings = await db.query.bookings.findMany({
    where: and(
      eq(schema.bookings.tripId, tripId),
      inArray(schema.bookings.status, ['confirmed', 'swapped'])
    ),
  });

  if (existingBookings.length > 0) {
    await db.update(schema.trips).set({ status: 'cancelled' }).where(eq(schema.trips.id, tripId));
    await db.update(schema.bookings).set({ status: 'cancelled', cancelReason: 'Trip cancelled by administrator' }).where(eq(schema.bookings.tripId, tripId));
  } else {
    await db.delete(schema.tripSupervisors).where(eq(schema.tripSupervisors.tripId, tripId));
    await db.delete(schema.trips).where(eq(schema.trips.id, tripId));
  }

  await db.insert(schema.auditLogs).values({
    userId: request.user.id,
    action: 'TRIP_CANCELLED',
    entityType: 'trip',
    entityId: String(tripId),
    details: { tripId, activeBookingsCount: existingBookings.length },
  });

  return { success: true };
});

// Admin: Clone / Reuse Schedule Across Dates
fastify.post('/api/admin/schedules/clone', {
  preValidation: [(fastify as any).authenticate, requireRole(['admin'])]
}, async (request: any, reply) => {
  const { sourceDate, targetDate, routeIds } = request.body as {
    sourceDate: string;
    targetDate: string;
    routeIds?: number[];
  };

  if (!sourceDate || !targetDate) {
    return reply.status(400).send({ error: 'sourceDate and targetDate (YYYY-MM-DD) are required' });
  }

  if (sourceDate === targetDate) {
    return reply.status(400).send({ error: 'sourceDate and targetDate must be different' });
  }

  const sourceTrips = await db.query.trips.findMany({
    where: and(
      eq(schema.trips.tripDate, sourceDate),
      routeIds && routeIds.length > 0 ? inArray(schema.trips.routeId, routeIds) : undefined
    ),
    with: {
      supervisors: true,
    },
  });

  if (sourceTrips.length === 0) {
    return reply.status(404).send({ error: `No scheduled trips found on source date ${sourceDate}` });
  }

  let clonedCount = 0;

  await db.transaction(async (tx) => {
    for (const st of sourceTrips) {
      const srcDep = new Date(st.departureTime);
      const targetDep = new Date(`${targetDate}T${srcDep.toISOString().substring(11, 19)}Z`);
      let targetRet: Date | null = null;
      if (st.returnTime) {
        const srcRet = new Date(st.returnTime);
        targetRet = new Date(`${targetDate}T${srcRet.toISOString().substring(11, 19)}Z`);
      }

      const [newTrip] = await tx.insert(schema.trips).values({
        routeId: st.routeId,
        busId: st.busId,
        driverId: st.driverId,
        tripDate: targetDate,
        departureTime: targetDep,
        returnTime: targetRet,
        direction: st.direction,
        timeSlot: st.timeSlot,
        totalSeats: st.totalSeats,
        priceEgp: st.priceEgp,
        status: 'scheduled',
        cancellationLockHours: st.cancellationLockHours,
      }).returning();

      if (st.supervisors && st.supervisors.length > 0) {
        await tx.insert(schema.tripSupervisors).values(
          st.supervisors.map(sv => ({
            tripId: newTrip.id,
            userId: sv.userId,
            assignedRole: sv.assignedRole,
          }))
        );
      }
      clonedCount++;
    }

    await tx.insert(schema.auditLogs).values({
      userId: request.user.id,
      action: 'SCHEDULE_CLONED',
      entityType: 'schedule',
      entityId: `${sourceDate}->${targetDate}`,
      details: { sourceDate, targetDate, clonedCount },
    });
  });

  return { success: true, clonedCount, sourceDate, targetDate };
});

// --- EMAIL DISPATCHERS ---

// Professional invoice-style confirmation email for one-way bookings
async function sendEmailConfirmation(
  email: string, name: string, trip: any, seatNumber: number,
  qrToken: string, legType: string, bookingType: string, paymentId: string
) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrToken)}`;
  const legLabel = legType === 'to_campus' ? 'To University' : 'Return Home';
  const legLabelAr = legType === 'to_campus' ? 'ذهاب للجامعة' : 'عودة للمنزل';
  const timeSlotLabels: Record<string, string> = {
    morning_1: 'Morning Shift 1 (05:00 – 10:00)',
    morning_2: 'Morning Shift 2 (10:00 – 11:30)',
    return: 'Return (12:00 – 17:10)',
  };
  const timeSlotLabel = timeSlotLabels[trip.timeSlot] || trip.timeSlot;
  
  // Redirect email to sandbox owner if using onboarding@resend.dev sender
  let recipient = email;
  if (emailFrom.includes('onboarding@resend.dev')) {
    recipient = sandboxOverrideRecipient;
    console.log(`[Email Sandbox Override] Redirecting email from ${email} to ${recipient} (due to Resend sandbox limitation)`);
  }

  console.log(`[Email] Sending booking confirmation to ${recipient} (original: ${email})...`);
  if (resendApiKey === 're_mock_key') {
    console.log(`[Email Mock] To: ${email}, Seat: ${seatNumber}, Leg: ${legType}, QR: ${qrToken.substring(0, 20)}...`);
    return;
  }

  const result = await resend.emails.send({
    from: emailFrom,
    to: recipient,
    subject: `🎫 Booking Confirmed: Seat ${seatNumber} — ${legLabel}`,
    html: buildInvoiceHtml({
      name,
      bookingType,
      legs: [{
        legLabel,
        legLabelAr,
        routeAr: trip.route.nameAr,
        routeEn: trip.route.nameEn,
        date: trip.tripDate,
        departureTime: new Date(trip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timeSlot: timeSlotLabel,
        seatNumber,
        qrUrl,
      }],
      paymentId,
      amount: '160.00 EGP',
      cancellationLockHours: trip.cancellationLockHours,
    }),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// Professional invoice-style confirmation email for round-trip bookings
async function sendRoundTripEmailConfirmation(
  email: string, name: string,
  toCampusTrip: any, toCampusSeat: number, arrivalQR: string,
  fromCampusTrip: any, fromCampusSeat: number, returnQR: string,
  paymentId: string, paymentMethod: string
) {
  const arrivalQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(arrivalQR)}`;
  const returnQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(returnQR)}`;

  const timeSlotLabels: Record<string, string> = {
    morning_1: 'Morning Shift 1 (05:00 – 10:00)',
    morning_2: 'Morning Shift 2 (10:00 – 11:30)',
    return: 'Return (12:00 – 17:10)',
  };

  // Redirect email to sandbox owner if using onboarding@resend.dev sender
  let recipient = email;
  if (emailFrom.includes('onboarding@resend.dev')) {
    recipient = sandboxOverrideRecipient;
    console.log(`[Email Sandbox Override] Redirecting email from ${email} to ${recipient} (due to Resend sandbox limitation)`);
  }

  console.log(`[Email] Sending round-trip confirmation to ${recipient} (original: ${email})...`);
  if (resendApiKey === 're_mock_key') {
    console.log(`[Email Mock] Round-trip: To: ${email}, Seat: ${toCampusSeat}, Arrival QR: ${arrivalQR.substring(0, 20)}..., Return QR: ${returnQR.substring(0, 20)}...`);
    return;
  }

  const result = await resend.emails.send({
    from: emailFrom,
    to: recipient,
    subject: `🎫 Round-Trip Booking Confirmed: Seat ${toCampusSeat}`,
    html: buildInvoiceHtml({
      name,
      bookingType: 'round_trip',
      legs: [
        {
          legLabel: 'To University',
          legLabelAr: 'ذهاب للجامعة',
          routeAr: toCampusTrip.route.nameAr,
          routeEn: toCampusTrip.route.nameEn,
          date: toCampusTrip.tripDate,
          departureTime: new Date(toCampusTrip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          timeSlot: timeSlotLabels[toCampusTrip.timeSlot] || toCampusTrip.timeSlot,
          seatNumber: toCampusSeat,
          qrUrl: arrivalQRUrl,
        },
        {
          legLabel: 'Return Home',
          legLabelAr: 'عودة للمنزل',
          routeAr: fromCampusTrip.route.nameAr,
          routeEn: fromCampusTrip.route.nameEn,
          date: fromCampusTrip.tripDate,
          departureTime: new Date(fromCampusTrip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          timeSlot: timeSlotLabels[fromCampusTrip.timeSlot] || fromCampusTrip.timeSlot,
          seatNumber: fromCampusSeat,
          qrUrl: returnQRUrl,
        },
      ],
      paymentId,
      amount: '160.00 EGP',
      cancellationLockHours: toCampusTrip.cancellationLockHours,
    }),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// Swap notification email
async function sendSwapNotificationEmail(email: string, name: string, oldTrip: any, newTrip: any, seatNumber: number, qrToken: string) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrToken)}`;
  // Redirect email to sandbox owner if using onboarding@resend.dev sender
  let recipient = email;
  if (emailFrom.includes('onboarding@resend.dev')) {
    recipient = sandboxOverrideRecipient;
    console.log(`[Email Sandbox Override] Redirecting email from ${email} to ${recipient} (due to Resend sandbox limitation)`);
  }

  console.log(`[Email] Sending swap notification to ${recipient} (original: ${email})...`);
  if (resendApiKey === 're_mock_key') {
    return;
  }

  const result = await resend.emails.send({
    from: emailFrom,
    to: recipient,
    subject: `⚠️ Bus Reassignment: New Seat Assigned`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h2 style="color: #f59e0b; margin-bottom: 16px;">⚠️ Important Notice: Ticket Reassignment</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>An administrator has reassigned your bus ticket due to scheduling changes.</p>
        <hr style="border: 1px solid #334155; margin: 24px 0;" />
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #94a3b8;">Old Trip:</td><td style="padding: 8px;">${oldTrip.route.nameEn} (${oldTrip.tripDate})</td></tr>
          <tr><td style="padding: 8px; color: #94a3b8;">New Trip:</td><td style="padding: 8px; color: #38bdf8;">${newTrip.route.nameEn} (${newTrip.tripDate})</td></tr>
          <tr><td style="padding: 8px; color: #94a3b8;">New Seat:</td><td style="padding: 8px; font-weight: bold; font-size: 18px;">${seatNumber}</td></tr>
        </table>
        <hr style="border: 1px solid #334155; margin: 24px 0;" />
        <p style="color: #f59e0b;">⚠️ Your old QR code is now <strong>invalidated</strong>. Use this new one:</p>
        <div style="text-align: center; padding: 16px;">
          <img src="${qrUrl}" alt="New QR Code" style="border: 3px solid #38bdf8; border-radius: 8px; padding: 8px; background: white;" />
        </div>
      </div>
    `
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// Forgot password email notification
async function sendForgotPasswordEmail(email: string, name: string, tempPassword: string) {
  // Redirect email to sandbox owner if using onboarding@resend.dev sender
  let recipient = email;
  if (emailFrom.includes('onboarding@resend.dev')) {
    recipient = sandboxOverrideRecipient;
    console.log(`[Email Sandbox Override] Redirecting password reset from ${email} to ${recipient} (due to Resend sandbox limitation)`);
  }

  console.log(`[Email] Sending password reset code to ${recipient} (original: ${email})...`);
  if (resendApiKey === 're_mock_key') {
    return;
  }

  const result = await resend.emails.send({
    from: emailFrom,
    to: recipient,
    subject: `🔑 Bus Aesh: Password Reset Code`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h2 style="color: #38bdf8; margin-bottom: 16px;">🔑 Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You requested a password reset for your Bus Aesh account.</p>
        <div style="background: #1e293b; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #334155;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; tracking-wider: 0.05em;">Temporary Password</p>
          <p style="font-family: monospace; font-size: 28px; font-weight: bold; color: #38bdf8; margin: 0; letter-spacing: 2px;">${tempPassword}</p>
        </div>
        <p style="color: #f59e0b; font-size: 13px;">⚠️ Use this temporary password to log in. You can update your password in your settings once logged in.</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 24px;">If you did not request this, you can ignore this email.</p>
      </div>
    `
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

// Professional invoice HTML builder — bilingual (English + Arabic)
function buildInvoiceHtml(data: {
  name: string;
  bookingType: string;
  legs: Array<{
    legLabel: string;
    legLabelAr: string;
    routeAr: string;
    routeEn: string;
    date: string;
    departureTime: string;
    timeSlot: string;
    seatNumber: number;
    qrUrl: string;
  }>;
  paymentId: string;
  amount: string;
  cancellationLockHours: number;
}): string {
  const bookingTypeLabel = data.bookingType === 'round_trip' ? '🔄 Round Trip' : '➡️ One Way';
  const bookingTypeLabelAr = data.bookingType === 'round_trip' ? 'ذهاب وعودة' : 'اتجاه واحد';

  const legSections = data.legs.map((leg, i) => `
    <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 16px; border-left: 4px solid ${leg.legLabel.includes('Return') ? '#a78bfa' : '#38bdf8'};">
      <h3 style="color: ${leg.legLabel.includes('Return') ? '#a78bfa' : '#38bdf8'}; margin: 0 0 12px 0; font-size: 16px;">
        ${leg.legLabel} — ${leg.legLabelAr}
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Route / المسار:</td>
          <td style="padding: 6px 0;">${leg.routeEn} — ${leg.routeAr}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Date / التاريخ:</td>
          <td style="padding: 6px 0;">${leg.date}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Time Slot / الوقت:</td>
          <td style="padding: 6px 0;">${leg.timeSlot}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Departure / المغادرة:</td>
          <td style="padding: 6px 0;">${leg.departureTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Seat / المقعد:</td>
          <td style="padding: 6px 0; font-weight: bold; font-size: 18px; color: #38bdf8;">${leg.seatNumber}</td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 16px; padding: 12px; background: white; border-radius: 8px; display: inline-block;">
        <img src="${leg.qrUrl}" alt="${leg.legLabel} QR Code" style="width: 200px; height: 200px;" />
        <p style="color: #475569; font-size: 11px; margin: 8px 0 0 0;">${leg.legLabel} QR — Show this to board</p>
      </div>
    </div>
  `).join('');

  return `
    <div style="max-width: 620px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0b0f19; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; text-align: center; border-bottom: 2px solid #334155;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">🚌 Bus Aesh</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Galala University Transport Service</p>
        <p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 13px;">خدمة النقل - جامعة الجلالة</p>
      </div>

      <!-- Invoice Body -->
      <div style="padding: 24px 32px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Passenger / الراكب</p>
            <p style="font-size: 18px; font-weight: bold; margin: 4px 0;">${data.name}</p>
          </div>
          <div style="text-align: right;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Booking Type / نوع الحجز</p>
            <p style="font-size: 14px; margin: 4px 0;">${bookingTypeLabel} — ${bookingTypeLabelAr}</p>
          </div>
        </div>

        <hr style="border: 1px solid #334155; margin: 0 0 24px 0;" />

        <!-- Trip Legs -->
        ${legSections}

        <!-- Payment Details -->
        <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-top: 16px; border-left: 4px solid #22c55e;">
          <h3 style="color: #22c55e; margin: 0 0 12px 0; font-size: 16px;">💳 Payment Details — تفاصيل الدفع</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Transaction ID:</td>
              <td style="padding: 6px 0; font-family: monospace;">${data.paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Amount / المبلغ:</td>
              <td style="padding: 6px 0; font-weight: bold; font-size: 18px; color: #22c55e;">${data.amount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Status / الحالة:</td>
              <td style="padding: 6px 0; color: #22c55e;">✅ Paid — مدفوع</td>
            </tr>
          </table>
        </div>

        <!-- Policies -->
        <div style="margin-top: 24px; padding: 16px; background: #1a1a2e; border-radius: 8px; border: 1px solid #334155;">
          <p style="color: #f59e0b; font-size: 13px; margin: 0 0 8px 0;">⚠️ Important — ملاحظات هامة:</p>
          <ul style="color: #94a3b8; font-size: 12px; padding-left: 16px; margin: 0;">
            <li>Each QR code is <strong>single-use</strong> — it expires immediately after scanning.</li>
            <li>QR codes expire automatically after <strong>24 hours</strong> if not used.</li>
            <li>Arrival QR cannot be used for return boarding and vice versa.</li>
            <li>Cancellation must be done at least <strong>${data.cancellationLockHours} hours</strong> before departure.</li>
            <li>كل رمز QR للاستخدام مرة واحدة فقط — ينتهي فوراً بعد المسح.</li>
            <li>تنتهي صلاحية رموز QR تلقائياً بعد 24 ساعة إذا لم تُستخدم.</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #0f172a; padding: 16px 32px; text-align: center; border-top: 1px solid #334155;">
        <p style="color: #64748b; font-size: 11px; margin: 0;">Bus Aesh — Galala University Transport © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`[${signal}] Shutting down gracefully...`);
  await fastify.close();
  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Launch Fastify Server
async function start() {
  try {
    await fastify.listen({ port, host });
    console.log(`Fastify server running on http://${host}:${port}`);
    
    // Warn about mock email mode
    if (resendApiKey === 're_mock_key') {
      console.log('\n⚠️  [Email] Running in MOCK MODE — no real emails will be sent.');
      console.log('    To enable real emails, set RESEND_API_KEY in apps/api/.env');
      console.log('    Get a free API key from https://resend.com\n');
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
