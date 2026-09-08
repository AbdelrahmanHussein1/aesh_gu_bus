import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { redis } from '../redis.js';
import { eq, and, inArray, ne } from 'drizzle-orm';
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
    return allRoutes;
  });

  // 2. Fetch active trips by date, route, direction, and optional time slot
  fastify.get('/api/trips', async (request, reply) => {
    const { date, routeId, direction, timeSlot, autoSeed } = request.query as {
      date?: string;
      routeId?: string;
      direction?: string;
      timeSlot?: string;
      autoSeed?: string;
    };
    if (!date) {
      return reply.status(400).send({ error: 'Missing date query parameter' });
    }

    const cacheKey = `cache:trips:${date}:${routeId || 'all'}:${direction || 'all'}:${timeSlot || 'all'}`;
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

    // Check if admin has purged trips so we don't automatically regenerate hundreds of shifts
    const isPurged = await redis.get('admin_purged_trips_flag');

    // Only auto-generate if no trips exist AND admin hasn't explicitly purged the roster
    if (activeTrips.length === 0 && !isPurged && autoSeed !== 'false') {
      const allRoutes = await db.query.routes.findMany({ where: eq(schema.routes.isActive, true) });
      const [defaultBus] = await db.select().from(schema.buses).limit(1);
      const [defaultSupervisor] = await db.select().from(schema.users).where(eq(schema.users.role, 'supervisor')).limit(1);

      if (defaultBus && allRoutes.length > 0) {
        for (const r of allRoutes) {
          // Morning trip (07:00 AM)
          const depMorning = new Date(`${date}T07:00:00+02:00`);
          const arrMorning = new Date(`${date}T09:00:00+02:00`);
          const [mTrip] = await db.insert(schema.trips).values({
            routeId: r.id,
            busId: defaultBus.id,
            driverId: defaultSupervisor?.id || null,
            tripDate: date,
            departureTime: depMorning,
            returnTime: arrMorning,
            direction: 'to_campus',
            timeSlot: 'morning_1',
            totalSeats: 50,
            status: 'scheduled',
            cancellationLockHours: 3,
          }).onConflictDoNothing().returning();

          if (mTrip && defaultSupervisor) {
            await db.insert(schema.tripSupervisors).values({
              tripId: mTrip.id,
              userId: defaultSupervisor.id,
              assignedRole: 'line_supervisor',
            }).onConflictDoNothing();
          }

          // Return trips (12:30, 14:30, 17:30)
          const returnSlots = [
            { slot: 'return_1', hour: 12, min: 30 },
            { slot: 'return_2', hour: 14, min: 30 },
            { slot: 'return_3', hour: 17, min: 30 },
          ];
          for (const ret of returnSlots) {
            const depRet = new Date(`${date}T${ret.hour}:${ret.min}:00+02:00`);
            const arrRet = new Date(depRet.getTime() + 2 * 60 * 60 * 1000);
            const [rTrip] = await db.insert(schema.trips).values({
              routeId: r.id,
              busId: defaultBus.id,
              driverId: defaultSupervisor?.id || null,
              tripDate: date,
              departureTime: depRet,
              returnTime: arrRet,
              direction: 'from_campus',
              timeSlot: ret.slot,
              totalSeats: 50,
              status: 'scheduled',
              cancellationLockHours: 3,
            }).onConflictDoNothing().returning();

            if (rTrip && defaultSupervisor) {
              await db.insert(schema.tripSupervisors).values({
                tripId: rTrip.id,
                userId: defaultSupervisor.id,
                assignedRole: 'line_supervisor',
              }).onConflictDoNothing();
            }
          }
        }

        // Re-query with generated trips
        activeTrips = await db.query.trips.findMany({
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
      }
    }

    const result = activeTrips.map(t => ({
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

    await CacheService.setCache(cacheKey, result, 60);
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
    const acquired = await (redis as any).set(lockKey, String(userId), 'NX', 'EX', 300);

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
