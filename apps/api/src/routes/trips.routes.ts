import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { redis } from '../redis.js';
import { eq, and, inArray, ne, desc } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';
import { logSecurityEvent } from '../services/audit.service.js';
import { CacheService } from '../services/cache.service.js';

export async function tripsRoutes(fastify: FastifyInstance) {
  // 1. Fetch routes and stops
  fastify.get('/api/routes', async () => {
    const allRoutes = await db.query.routes.findMany({
      where: eq(schema.routes.isActive, true),
      with: {
        stops: true,
      },
    });
    return allRoutes.map(route => {
      const byOrder = new Map<number, (typeof route.stops)[number]>();
      for (const stop of route.stops) {
        const previous = byOrder.get(stop.stopOrder);
        if (!previous || stop.id > previous.id) byOrder.set(stop.stopOrder, stop);
      }
      return { ...route, stops: [...byOrder.values()].sort((a, b) => a.stopOrder - b.stopOrder) };
    });
  });

  // 2. Fetch active trips by date, route, direction, and optional time slot
  fastify.get('/api/trips', async (request, reply) => {
    const { date, routeId, direction, timeSlot, includePassengers } = request.query as {
      date?: string;
      routeId?: string;
      direction?: string;
      timeSlot?: string;
      includePassengers?: string;
    };
    if (!date) {
      return reply.status(400).send({ error: 'Missing date query parameter' });
    }

    const privileged = includePassengers === 'true';
    if (privileged) {
      await (fastify as any).authenticate(request, reply);
      if (reply.sent) return;
      if (!['admin', 'supervisor'].includes((request as any).user?.role)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
    }

    const cacheKey = `cache:trips:${privileged ? 'staff' : 'public'}:${date}:${routeId || 'all'}:${direction || 'all'}:${timeSlot || 'all'}`;
    const cached = await CacheService.getCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [
      eq(schema.trips.tripDate, date),
      ne(schema.trips.status, 'cancelled'),
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

    let activeTrips = await db.query.trips.findMany({
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

    const tripIds = activeTrips.map(t => t.id);
    const bookingsByTrip = new Map<number, any[]>();

    if (tripIds.length > 0) {
      const allConfirmedBookings = await db.query.bookings.findMany({
        where: and(
          inArray(schema.bookings.tripId, tripIds),
          inArray(schema.bookings.status, ['confirmed', 'swapped'])
        ),
        with: {
          user: true,
          boardingLogs: {
            orderBy: desc(schema.boardingLogs.scannedAt),
          },
        },
      });

      for (const b of allConfirmedBookings) {
        const list = bookingsByTrip.get(b.tripId) || [];
        list.push(b);
        bookingsByTrip.set(b.tripId, list);
      }
    }

    const result = activeTrips.map(t => {
      const tripBookings = bookingsByTrip.get(t.id) || [];
      const bookedSeats = tripBookings.length;
      const boardedBookings = tripBookings.filter(b => b.qrUsedAt !== null || b.boardingLogs?.some((l: any) => l.scanResult === 'valid'));
      const boardedSeats = boardedBookings.length;
      const pendingSeats = Math.max(0, bookedSeats - boardedSeats);

      const passengers = tripBookings.map(b => {
        const isValidBoarded = b.qrUsedAt !== null || b.boardingLogs?.some((l: any) => l.scanResult === 'valid');
        const validLog = b.boardingLogs?.find((l: any) => l.scanResult === 'valid');
        const boardedAt = b.qrUsedAt || validLog?.scannedAt || null;

        return {
          bookingId: b.id,
          seatNumber: b.seatNumber,
          riderName: b.user?.fullName || 'Student',
          riderNameAr: b.user?.fullNameAr || b.user?.fullName || 'طالب',
          phone: b.user?.phone || '—',
          academicId: b.user?.academicId || '—',
          faculty: b.user?.faculty || '—',
          boardingCode: b.boardingCode || ('GU-' + b.id.substring(0, 4).toUpperCase()),
          isBoarded: Boolean(isValidBoarded),
          boardedAt: boardedAt ? new Date(boardedAt).toISOString() : null,
        };
      });

      return {
        id: t.id,
        routeId: t.routeId,
        tripDate: t.tripDate,
        departureTime: t.departureTime,
        returnTime: t.returnTime,
        direction: t.direction,
        timeSlot: t.timeSlot,
        totalSeats: t.totalSeats,
        bookedSeats,
        boardedSeats,
        pendingSeats,
        passengers: privileged ? passengers : [],
        priceEgp: Number(t.priceEgp),
        status: t.status,
        cancellationLockHours: t.cancellationLockHours,
        bus: t.bus,
        route: t.route,
        driver: privileged && t.driver ? {
          nameAr: t.driver.fullNameAr || t.driver.fullName,
          nameEn: t.driver.fullName,
          phone: t.driver.phone || '',
        } : null,
        supervisors: privileged ? t.supervisors?.map((s: any) => ({
          nameAr: s.user.fullNameAr || s.user.fullName,
          nameEn: s.user.fullName,
          phone: s.user.phone || '',
        })) || [] : [],
      };
    });

    await CacheService.setCache(cacheKey, result, 15);
    return result;
  });

  // 3. Fetch live seat map for a trip (DB confirmed + Redis temporary locks)
  fastify.get('/api/trips/:tripId/seats', async (request, reply) => {
    const { tripId } = request.params as { tripId: string };
    const id = parseInt(tripId);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid tripId' });
    }

    const cacheKey = `cache:trip_seats:${id}`;
    const cached = await CacheService.getCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const trip = await db.query.trips.findFirst({
      where: eq(schema.trips.id, id),
      with: { bus: true },
    });
    if (!trip) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    const totalSeats = trip.bus?.totalSeats || trip.totalSeats;

    const confirmedBookings = await db.query.bookings.findMany({
      where: and(
        eq(schema.bookings.tripId, id),
        inArray(schema.bookings.status, ['confirmed', 'swapped'])
      ),
    });

    const lockKeys = Array.from({ length: totalSeats }, (_, i) => `seat_lock:${id}:${i + 1}`);
    const locks = await redis.mget(...lockKeys);

    const seatMap = Array.from({ length: totalSeats }, (_, i) => {
      const seatNumber = i + 1;
      const booking = confirmedBookings.find(b => b.seatNumber === seatNumber);
      const lockHolder = locks[i];

      if (booking) {
        return { seatNumber, status: 'booked' };
      } else if (lockHolder) {
        return { seatNumber, status: 'held' };
      } else {
        return { seatNumber, status: 'free' };
      }
    });

    await CacheService.setCache(cacheKey, seatMap, 5);
    return seatMap;
  });

  // 4. Lock a seat (5-min Redis lock) & Broadcast Real-Time Seat Graying
  fastify.post('/api/trips/:tripId/seats/:seatNumber/lock', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const { tripId, seatNumber } = request.params as { tripId: string; seatNumber: string };
    const userId = request.user.id;
    const tid = parseInt(tripId);
    const sn = parseInt(seatNumber);

    if (isNaN(tid) || isNaN(sn)) {
      return reply.status(400).send({ error: 'Invalid tripId or seatNumber' });
    }

    const existing = await db.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.tripId, tid),
        eq(schema.bookings.seatNumber, sn),
        inArray(schema.bookings.status, ['confirmed', 'swapped'])
      ),
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Seat already booked',
        code: 'SEAT_ALREADY_BOOKED',
        messageAr: 'عذراً، هذا المقعد محجوز بالفعل',
      });
    }

    const lockKey = `seat_lock:${tid}:${sn}`;
    const acquired = await (redis as any).set(lockKey, String(userId), 'EX', 300, 'NX');

    if (acquired === 'OK') {
      WebSocketHub.broadcastToTripRoom(tid, {
        type: 'seat_locked',
        tripId: tid,
        seatNumber: sn,
        expiresAt: Date.now() + 300000,
      });

      await logSecurityEvent({
        userId,
        action: 'SEAT_LOCK_HELD',
        entityType: 'trip_seat',
        entityId: `${tid}:${sn}`,
        details: { tripId: tid, seatNumber: sn, durationSeconds: 300 },
        ipAddress: request.ip,
      });

      await CacheService.invalidateSeatCache(tid);

      return { success: true, expiresAt: Date.now() + 300000 };
    } else {
      return reply.status(409).send({
        error: 'Seat is currently held by another student',
        code: 'SEAT_HELD',
        messageAr: 'هذا المقعد محجوز مؤقتاً من قبل طالب آخر',
      });
    }
  });

  // 5. Unlock/Deselect a seat
  fastify.post('/api/trips/:tripId/seats/:seatNumber/unlock', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
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
      WebSocketHub.broadcastToTripRoom(tid, {
        type: 'seat_unlocked',
        tripId: tid,
        seatNumber: sn,
      });

      await logSecurityEvent({
        userId,
        action: 'SEAT_LOCK_RELEASED',
        entityType: 'trip_seat',
        entityId: `${tid}:${sn}`,
        details: { tripId: tid, seatNumber: sn },
        ipAddress: request.ip,
      });

      await CacheService.invalidateSeatCache(tid);

      return { success: true };
    } else {
      return reply.status(403).send({ error: 'You do not own this seat lock' });
    }
  });
}
