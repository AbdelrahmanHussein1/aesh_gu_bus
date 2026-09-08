import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, desc, inArray, ne } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';
import { redis } from '../redis.js';
import { logSecurityEvent } from '../services/audit.service.js';
import { CacheService } from '../services/cache.service.js';

const requireRole = (roles: string[]) => async (request: any, reply: any) => {
  const user = request.user;
  if (!user || !roles.includes(user.role)) {
    return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
  }
};

const isUuid = (val: unknown): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

export async function adminRoutes(fastify: FastifyInstance) {
  // 1. Dynamic Fleet Status Overview (Live Real-Time Fleet Monitor)
  // 1. Dynamic Fleet Status Overview (Live Real-Time Fleet Monitor with Full Custom Filtering)
  fastify.get('/api/admin/fleet', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any) => {
    const {
      date,
      routeId,
      direction,
      timeSlot,
      status: filterStatus,
      search,
    } = request.query as {
      date?: string;
      routeId?: string;
      direction?: string;
      timeSlot?: string;
      status?: string;
      search?: string;
    };

    const cacheKey = `cache:fleet:${date || 'all'}:${routeId || 'all'}:${direction || 'all'}:${timeSlot || 'all'}:${filterStatus || 'all'}:${search || 'none'}`;
    const cached = await CacheService.getCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions: any[] = [];
    if (date && date !== 'all') {
      conditions.push(eq(schema.trips.tripDate, date));
    }
    if (routeId && routeId !== 'all') {
      const rid = parseInt(routeId);
      if (!isNaN(rid)) conditions.push(eq(schema.trips.routeId, rid));
    }
    if (direction && direction !== 'all') {
      conditions.push(eq(schema.trips.direction, direction));
    }
    if (timeSlot && timeSlot !== 'all') {
      conditions.push(eq(schema.trips.timeSlot, timeSlot));
    }

    const activeTrips = await db.query.trips.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        bus: true,
        route: true,
        driver: true,
        supervisors: { with: { user: true } },
        bookings: {
          where: inArray(schema.bookings.status, ['confirmed', 'swapped']),
          with: { user: true },
        },
      },
      orderBy: [desc(schema.trips.tripDate), schema.trips.departureTime],
    });

    const fleetResults = await Promise.all(activeTrips.map(async (trip) => {
      const capacity = trip.bus?.totalSeats || trip.totalSeats || 50;
      const bookedSeats = trip.bookings.length;

      // Check live Redis locks for in-progress held seats
      let heldSeats = 0;
      try {
        const lockKeys = Array.from({ length: capacity }, (_, i) => `seat_lock:${trip.id}:${i + 1}`);
        const locks = await redis.mget(...lockKeys);
        heldSeats = locks.filter(Boolean).length;
      } catch {}

      const freeSeats = Math.max(0, capacity - bookedSeats - heldSeats);
      const percent = Math.min(100, Math.round(((bookedSeats + heldSeats) / capacity) * 100));

      const driverName = trip.driver ? (trip.driver.fullNameAr || trip.driver.fullName) : 'محمد صبحي (Mohamed Sobhi)';
      const driverPhone = trip.driver?.phone || '01021561196';
      const firstSupervisor = trip.supervisors?.[0]?.user;
      const superName = firstSupervisor ? (firstSupervisor.fullNameAr || firstSupervisor.fullName) : 'ممدوح بدران (Mamdouh Badran)';
      const superPhone = firstSupervisor?.phone || '01275467090';

      let computedStatus = trip.status || 'scheduled';
      if (bookedSeats >= capacity) {
        computedStatus = 'full';
      } else if (heldSeats > 0 && percent >= 75) {
        computedStatus = 'filling_fast';
      } else if (bookedSeats > 0) {
        computedStatus = 'boarding';
      }

      return {
        tripId: trip.id,
        routeId: trip.routeId,
        tripDate: trip.tripDate,
        nameAr: trip.route?.nameAr || 'خط الجلالة',
        nameEn: trip.route?.nameEn || 'Galala Line',
        direction: trip.direction,
        timeSlot: trip.timeSlot,
        departureTime: trip.departureTime instanceof Date ? trip.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(trip.departureTime || '07:00 AM'),
        busName: trip.bus?.name || `باص جامعة الجلالة #${trip.id}`,
        licensePlate: trip.bus?.licensePlate || `أ ب ج ${100 + (trip.id % 20)}`,
        driverName,
        driverPhone,
        superName,
        superPhone,
        bookedSeats,
        heldSeats,
        freeSeats,
        capacity,
        occupancyPercent: percent,
        status: computedStatus,
        passengersPreview: trip.bookings.slice(0, 5).map(b => ({
          seatNumber: b.seatNumber,
          studentName: b.user?.fullName,
          academicId: b.user?.academicId || (b.user?.email ? b.user.email.split('@')[0] : 'N/A'),
        })),
      };
    }));

    // Post-filter by status or search text if specified
    let filtered = fleetResults;
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(f => f.status === filterStatus);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(f =>
        f.nameAr.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.busName.toLowerCase().includes(q) ||
        f.licensePlate.toLowerCase().includes(q) ||
        f.driverName.toLowerCase().includes(q) ||
        f.superName.toLowerCase().includes(q) ||
        String(f.tripId).includes(q)
      );
    }

    await CacheService.setCache(cacheKey, filtered, 30);
    return filtered;
  });

  // 2. Rich Comprehensive Audit Logs (with search, filter, and student metadata)
  fastify.get('/api/admin/audit-logs', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any) => {
    const { limit = 150, search, action } = request.query as { limit?: string; search?: string; action?: string };
    const maxLimit = Math.min(Number(limit) || 150, 500);

    const logs = await db.query.auditLogs.findMany({
      orderBy: desc(schema.auditLogs.createdAt),
      limit: maxLimit,
      with: {
        user: true,
      },
    });

    let results = logs.map(l => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      details: l.details,
      ipAddress: l.ipAddress || '127.0.0.1',
      time: l.createdAt,
      user: l.user ? {
        id: l.user.id,
        fullName: l.user.fullName,
        fullNameAr: l.user.fullNameAr,
        email: l.user.email,
        phone: l.user.phone,
        role: l.user.role,
        academicId: l.user.academicId || l.user.email.split('@')[0],
        faculty: l.user.faculty,
      } : null,
    }));

    if (action && action !== 'all') {
      results = results.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    }

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(l =>
        l.action.toLowerCase().includes(q) ||
        (l.entityId && String(l.entityId).toLowerCase().includes(q)) ||
        (l.user?.email && l.user.email.toLowerCase().includes(q)) ||
        (l.user?.fullName && l.user.fullName.toLowerCase().includes(q)) ||
        (l.user?.academicId && l.user.academicId.toLowerCase().includes(q)) ||
        (l.ipAddress && l.ipAddress.includes(q)) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      );
    }

    return results;
  });

  // 2.1. Trip Full Seat Breakdown & Visual Inspector (Admin & Supervisor)
  fastify.get('/api/admin/trips/:tripId/seat-details', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin', 'supervisor'])],
  }, async (request: any, reply) => {
    const { tripId } = request.params as { tripId: string };
    const tid = parseInt(tripId);
    if (isNaN(tid)) {
      return reply.status(400).send({ error: 'Invalid tripId' });
    }

    const cacheKey = `cache:seat_details:${tid}`;
    const cached = await CacheService.getCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const trip = await db.query.trips.findFirst({
      where: eq(schema.trips.id, tid),
      with: {
        bus: true,
        route: true,
        driver: true,
        supervisors: { with: { user: true } },
      },
    });

    if (!trip) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    const totalSeats = trip.bus?.totalSeats || trip.totalSeats || 50;

    // 1. Confirmed bookings with passenger profile & boarding status
    const bookings = await db.query.bookings.findMany({
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

    // 2. Active temporary Redis locks (Orange In-Progress Seats)
    const lockKeys = Array.from({ length: totalSeats }, (_, i) => `seat_lock:${tid}:${i + 1}`);
    const lockValues = await redis.mget(...lockKeys);
    const lockHoldersMap: Record<number, string> = {};
    const lockUserIds: string[] = [];

    for (let i = 0; i < lockValues.length; i++) {
      const val = lockValues[i];
      if (val) {
        lockHoldersMap[i + 1] = val;
        if (!lockUserIds.includes(val)) {
          lockUserIds.push(val);
        }
      }
    }

    let lockUsers: any[] = [];
    if (lockUserIds.length > 0) {
      lockUsers = await db.query.users.findMany({
        where: inArray(schema.users.id, lockUserIds),
      });
    }

    // TTL for held seats
    const lockTtlMap: Record<number, number> = {};
    for (const sn of Object.keys(lockHoldersMap).map(Number)) {
      const ttl = await redis.ttl(`seat_lock:${tid}:${sn}`);
      lockTtlMap[sn] = ttl > 0 ? ttl : 300;
    }

    // Build complete 1..totalSeats map
    const seatDetails = Array.from({ length: totalSeats }, (_, i) => {
      const seatNumber = i + 1;
      const booking = bookings.find(b => b.seatNumber === seatNumber);
      const lockHolderId = lockHoldersMap[seatNumber];

      if (booking) {
        const validBoardingLog = booking.boardingLogs?.find(l => l.scanResult === 'valid');
        return {
          seatNumber,
          status: 'booked' as const,
          booking: {
            id: booking.id,
            bookingType: booking.bookingType,
            legType: booking.legType,
            boardingCode: booking.boardingCode || ('GU-' + booking.id.substring(0, 4).toUpperCase()),
            bookedAt: booking.createdAt,
            paymentStatus: booking.paymentStatus,
            receiptRef: booking.receiptRef,
            fare: 160,
            isBoarded: Boolean(validBoardingLog),
            boardedAt: validBoardingLog?.scannedAt || null,
          },
          rider: {
            id: booking.user?.id,
            fullName: booking.user?.fullName || 'Galala Student',
            fullNameAr: booking.user?.fullNameAr || null,
            email: booking.user?.email || 'student@gu.edu.eg',
            phone: booking.user?.phone || '01000000000',
            academicId: booking.user?.academicId || (booking.user?.email ? booking.user.email.split('@')[0] : 'N/A'),
            faculty: booking.user?.faculty || 'Computer Science & AI / Galala University',
            role: booking.user?.role || 'rider',
          },
        };
      } else if (lockHolderId) {
        const holderUser = lockUsers.find(u => u.id === lockHolderId);
        const remainingSeconds = lockTtlMap[seatNumber] || 300;
        return {
          seatNumber,
          status: 'held' as const, // ORANGE IN-PROGRESS SEAT
          lock: {
            holderId: lockHolderId,
            remainingSeconds,
            heldAt: new Date(Date.now() - (300 - remainingSeconds) * 1000),
          },
          rider: holderUser ? {
            id: holderUser.id,
            fullName: holderUser.fullName,
            fullNameAr: holderUser.fullNameAr,
            email: holderUser.email,
            phone: holderUser.phone || '01000000000',
            academicId: holderUser.academicId || holderUser.email.split('@')[0],
            faculty: holderUser.faculty || 'Engineering / Galala University',
            role: holderUser.role,
          } : {
            id: lockHolderId,
            fullName: 'Student in Checkout',
            fullNameAr: 'طالب في مرحلة الدفع',
            email: 'student@gu.edu.eg',
            phone: 'N/A',
            academicId: 'N/A',
            faculty: 'Galala University',
            role: 'rider',
          },
        };
      } else {
        return {
          seatNumber,
          status: 'free' as const, // UNTAKEN SEAT
        };
      }
    });

    const responsePayload = {
      trip: {
        id: trip.id,
        tripDate: trip.tripDate,
        direction: trip.direction,
        timeSlot: trip.timeSlot,
        departureTime: trip.departureTime instanceof Date ? trip.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(trip.departureTime || '07:00 AM'),
        status: trip.status,
        totalSeats,
        bookedCount: bookings.length,
        heldCount: Object.keys(lockHoldersMap).length,
        freeCount: totalSeats - bookings.length - Object.keys(lockHoldersMap).length,
        bus: trip.bus ? {
          id: trip.bus.id,
          name: trip.bus.name,
          licensePlate: trip.bus.licensePlate,
          totalSeats: trip.bus.totalSeats,
        } : {
          name: 'باص جامعة الجلالة',
          licensePlate: 'أ ب ج 100',
          totalSeats: 50,
        },
        route: trip.route ? {
          id: trip.route.id,
          nameAr: trip.route.nameAr,
          nameEn: trip.route.nameEn,
        } : null,
        driver: trip.driver ? {
          id: trip.driver.id,
          fullName: trip.driver.fullNameAr || trip.driver.fullName,
          phone: trip.driver.phone,
        } : {
          fullName: 'محمد صبحي',
          phone: '01021561196',
        },
        supervisors: trip.supervisors?.map(s => ({
          id: s.user?.id,
          fullName: s.user?.fullNameAr || s.user?.fullName,
          phone: s.user?.phone,
        })) || [{ fullName: 'ممدوح بدران', phone: '01275467090' }],
      },
      seats: seatDetails,
    };

    await CacheService.setCache(cacheKey, responsePayload, 5);
    return responsePayload;
  });

  // 2.2. Database Explorer: Users
  fastify.get('/api/admin/database/users', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any) => {
    const { search, role, limit = 200 } = request.query as any;
    const allUsers = await db.query.users.findMany({
      orderBy: desc(schema.users.createdAt),
      limit: Math.min(Number(limit) || 200, 500),
    });

    let filtered = allUsers;
    if (role && role !== 'all') {
      filtered = filtered.filter(u => u.role === role);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.academicId && u.academicId.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))
      );
    }

    const counts = {
      total: allUsers.length,
      riders: allUsers.filter(u => u.role === 'rider').length,
      supervisors: allUsers.filter(u => u.role === 'supervisor').length,
      admins: allUsers.filter(u => u.role === 'admin').length,
    };

    return { users: filtered, counts };
  });

  // 2.3. Database Explorer: Bookings
  fastify.get('/api/admin/database/bookings', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any) => {
    const { search, status, limit = 200 } = request.query as any;
    const allBookings = await db.query.bookings.findMany({
      orderBy: desc(schema.bookings.createdAt),
      limit: Math.min(Number(limit) || 200, 500),
      with: {
        user: true,
        trip: {
          with: { route: true, bus: true },
        },
      },
    });

    let filtered = allBookings;
    if (status && status !== 'all') {
      filtered = filtered.filter(b => b.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(b =>
        b.user?.email?.toLowerCase().includes(q) ||
        b.user?.fullName?.toLowerCase().includes(q) ||
        b.user?.academicId?.toLowerCase().includes(q) ||
        b.boardingCode?.toLowerCase().includes(q) ||
        b.receiptRef?.toLowerCase().includes(q)
      );
    }

    return {
      bookings: filtered.map(b => ({
        id: b.id,
        seatNumber: b.seatNumber,
        status: b.status,
        bookingType: b.bookingType,
        legType: b.legType,
        boardingCode: b.boardingCode || ('GU-' + b.id.substring(0, 4).toUpperCase()),
        paymentStatus: b.paymentStatus,
        receiptRef: b.receiptRef,
        createdAt: b.createdAt,
        user: b.user ? {
          id: b.user.id,
          fullName: b.user.fullName,
          email: b.user.email,
          phone: b.user.phone,
          academicId: b.user.academicId || b.user.email.split('@')[0],
          faculty: b.user.faculty,
        } : null,
        trip: b.trip ? {
          id: b.trip.id,
          tripDate: b.trip.tripDate,
          timeSlot: b.trip.timeSlot,
          departureTime: b.trip.departureTime instanceof Date ? b.trip.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(b.trip.departureTime),
          direction: b.trip.direction,
          routeName: b.trip.route?.nameAr || 'خط الجلالة',
          busName: b.trip.bus?.name || 'باص الجلالة',
        } : null,
      })),
      totalCount: allBookings.length,
    };
  });

  // 2.4. Database Explorer: Clean Test Student (Purges user and all bookings/logs)
  fastify.post('/api/admin/database/clean-test-student', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any, reply) => {
    const { email = 'aes400196@gu.edu.eg' } = request.body as any;
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase().trim()),
    });

    if (!targetUser) {
      return reply.status(404).send({ error: `User ${email} not found in database.` });
    }

    const userBookings = await db.query.bookings.findMany({
      where: eq(schema.bookings.userId, targetUser.id),
    });
    const bIds = userBookings.map(b => b.id);
    if (bIds.length > 0) {
      await db.delete(schema.boardingLogs).where(inArray(schema.boardingLogs.bookingId, bIds));
      await db.delete(schema.swapLogs).where(inArray(schema.swapLogs.oldBookingId, bIds));
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, bIds));
    }
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.userId, targetUser.id));
    await db.delete(schema.verificationTokens).where(eq(schema.verificationTokens.email, targetUser.email));
    await db.delete(schema.users).where(eq(schema.users.id, targetUser.id));

    await logSecurityEvent({
      userId: request.user.id,
      action: 'ADMIN_CLEAN_TEST_USER',
      entityType: 'user',
      entityId: targetUser.id,
      details: { cleanedEmail: email, purgedBookingsCount: bIds.length },
      ipAddress: request.ip,
    });

    await CacheService.invalidateTripsAndFleetCache();

    return { success: true, message: `Successfully cleaned ${email} and all associated test records.` };
  });

  // 3. Settings
  fastify.get('/api/admin/settings', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async () => {
    const setting = await db.query.systemSettings.findFirst({
      where: eq(schema.systemSettings.key, 'cancellation_lock_hours'),
    });

    return {
      cancellationLockHours: (setting?.value as any)?.hours ?? 3,
    };
  });

  fastify.put('/api/admin/settings', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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

    await db.insert(schema.auditLogs).values({
      userId: request.user.id,
      action: 'POLICY_UPDATED',
      entityType: 'settings',
      entityId: 'cancellation_lock_hours',
      details: { cancellationLockHours },
    });

    return { success: true, cancellationLockHours };
  });

  // 4. Schedules List
  fastify.get('/api/admin/schedules', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any) => {
    const { date, routeId } = request.query as { date?: string; routeId?: string };

    const cacheKey = `cache:schedules:${date || 'all'}:${routeId || 'all'}`;
    const cached = await CacheService.getCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const conditions: any[] = [
      ne(schema.trips.status, 'cancelled'),
    ];
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

    const result = allTrips.map(t => ({
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

    await CacheService.setCache(cacheKey, result, 60);
    return result;
  });

  // 5. Personnel
  fastify.get('/api/admin/personnel', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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

  // 6. Create Trip
  fastify.post('/api/admin/trips', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any, reply) => {
    try {
      const body = request.body as any;
      const {
        routeId, busId, driverId, supervisorIds,
        tripDate, departureTime, returnTime, direction,
        timeSlot, totalSeats, priceEgp
      } = body;

      if (!routeId || !tripDate || !departureTime) {
        return reply.status(400).send({ error: 'routeId, tripDate, and departureTime are required' });
      }

      // Helper to safely parse date & time
      const parseTimeSafe = (dateStr: string, timeInput: any, defaultHour = 7, defaultMin = 0): Date => {
        if (!timeInput) return new Date(`${dateStr}T${String(defaultHour).padStart(2, '0')}:${String(defaultMin).padStart(2, '0')}:00+02:00`);
        if (timeInput instanceof Date) return timeInput;
        const str = String(timeInput).trim();
        const ampmMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const mins = parseInt(ampmMatch[2], 10);
          const mer = ampmMatch[3]?.toUpperCase();
          if (mer === 'PM' && hours < 12) hours += 12;
          if (mer === 'AM' && hours === 12) hours = 0;
          const hh = String(hours).padStart(2, '0');
          const mm = String(mins).padStart(2, '0');
          return new Date(`${dateStr}T${hh}:${mm}:00+02:00`);
        }
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) return parsed;
        return new Date(`${dateStr}T${String(defaultHour).padStart(2, '0')}:${String(defaultMin).padStart(2, '0')}:00+02:00`);
      };

      const depDate = parseTimeSafe(tripDate, departureTime, 7, 0);
      const retDate = returnTime ? parseTimeSafe(tripDate, returnTime, 14, 30) : null;

      let assignedBusId = busId ? parseInt(busId) : null;
      if (!assignedBusId || isNaN(assignedBusId)) {
        const firstBus = await db.query.buses.findFirst();
        assignedBusId = firstBus?.id || 1;
      }

      // Resolve driverId safely (UUID vs phone/email)
      let resolvedDriverId: string | null = null;
      if (driverId) {
        const dStr = String(driverId).trim();
        if (dStr && dStr !== 'null' && dStr !== 'undefined') {
          let uDriver = null;
          if (isUuid(dStr)) {
            uDriver = await db.query.users.findFirst({
              where: eq(schema.users.id, dStr),
            });
          } else {
            uDriver = await db.query.users.findFirst({
              where: or(
                eq(schema.users.phone, dStr),
                eq(schema.users.email, dStr)
              ),
            });
          }
          if (uDriver) {
            resolvedDriverId = uDriver.id;
          }
        }
      }

      // Resolve supervisorIds safely (UUIDs vs phones/emails)
      const resolvedSupervisorIds: string[] = [];
      if (Array.isArray(supervisorIds) && supervisorIds.length > 0) {
        for (const sId of supervisorIds) {
          if (!sId) continue;
          const sStr = String(sId).trim();
          if (!sStr || sStr === 'null' || sStr === 'undefined') continue;
          let sUser = null;
          if (isUuid(sStr)) {
            sUser = await db.query.users.findFirst({
              where: eq(schema.users.id, sStr),
            });
          } else {
            sUser = await db.query.users.findFirst({
              where: or(
                eq(schema.users.phone, sStr),
                eq(schema.users.email, sStr)
              ),
            });
          }
          if (sUser && !resolvedSupervisorIds.includes(sUser.id)) {
            resolvedSupervisorIds.push(sUser.id);
          }
        }
      }

      const [newTrip] = await db.insert(schema.trips).values({
        routeId: parseInt(routeId),
        busId: assignedBusId,
        driverId: resolvedDriverId,
        tripDate,
        departureTime: depDate,
        returnTime: retDate,
        direction: direction || 'to_campus',
        timeSlot: timeSlot || 'morning_1',
        totalSeats: totalSeats ? parseInt(totalSeats) : 50,
        priceEgp: priceEgp ? String(priceEgp) : '160.00',
        status: 'scheduled',
      }).returning();

      if (resolvedSupervisorIds.length > 0) {
        await db.insert(schema.tripSupervisors).values(
          resolvedSupervisorIds.map((uid: string) => ({
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

      try {
        const route = await db.query.routes.findFirst({
          where: eq(schema.routes.id, parseInt(routeId)),
        });
        WebSocketHub.broadcastToAll({
          type: 'NEW_TRIP_ANNOUNCED',
          tripId: newTrip.id,
          routeId: newTrip.routeId,
          routeNameAr: route?.nameAr || 'خط جديد',
          routeNameEn: route?.nameEn || 'New Route',
          tripDate: newTrip.tripDate,
          timeSlot: newTrip.timeSlot,
          messageAr: `📢 شفت جديد متاح الآن! تمت إضافة حافلة على خط ${route?.nameAr || ''} لتاريخ ${newTrip.tripDate}.`,
          messageEn: `📢 New shift available! Route: ${route?.nameEn || ''} on ${newTrip.tripDate}.`,
        });
      } catch (e) {
        console.warn('[Admin] Failed to broadcast new trip notification:', e);
      }

      await CacheService.invalidateTripsAndFleetCache(newTrip.id);

      return { success: true, trip: newTrip };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || 'Failed to create trip',
        details: String(err),
      });
    }
  });

  // 7. Update Trip
  fastify.put('/api/admin/trips/:id', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string };
      const tripId = parseInt(id);
      if (isNaN(tripId)) return reply.status(400).send({ error: 'Invalid trip ID' });

      const body = request.body as any;
      const { driverId, supervisorIds, departureTime, returnTime, status, timeSlot, totalSeats, priceEgp } = body;

      const updateData: any = { updatedAt: new Date() };

      if (driverId !== undefined) {
        if (!driverId) {
          updateData.driverId = null;
        } else {
          const dStr = String(driverId).trim();
          if (isUuid(dStr)) {
            updateData.driverId = dStr;
          } else {
            const uDriver = await db.query.users.findFirst({
              where: or(
                eq(schema.users.phone, dStr),
                eq(schema.users.email, dStr)
              ),
            });
            updateData.driverId = uDriver ? uDriver.id : null;
          }
        }
      }

      if (departureTime) updateData.departureTime = new Date(departureTime);
      if (returnTime) updateData.returnTime = new Date(returnTime);
      if (status) updateData.status = status;
      if (timeSlot) updateData.timeSlot = timeSlot;
      if (totalSeats) updateData.totalSeats = parseInt(totalSeats);
      if (priceEgp) updateData.priceEgp = String(priceEgp);

      await db.update(schema.trips).set(updateData).where(eq(schema.trips.id, tripId));

      if (Array.isArray(supervisorIds)) {
        await db.delete(schema.tripSupervisors).where(eq(schema.tripSupervisors.tripId, tripId));
        const resolvedSupIds: string[] = [];
        for (const sId of supervisorIds) {
          if (!sId) continue;
          const sStr = String(sId).trim();
          if (isUuid(sStr)) {
            resolvedSupIds.push(sStr);
          } else {
            const sUser = await db.query.users.findFirst({
              where: or(
                eq(schema.users.phone, sStr),
                eq(schema.users.email, sStr)
              ),
            });
            if (sUser && !resolvedSupIds.includes(sUser.id)) {
              resolvedSupIds.push(sUser.id);
            }
          }
        }

        if (resolvedSupIds.length > 0) {
          await db.insert(schema.tripSupervisors).values(
            resolvedSupIds.map((uid: string) => ({
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

      await CacheService.invalidateTripsAndFleetCache(tripId);

      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || 'Failed to update trip',
        details: String(err),
      });
    }
  });

  // 8. Delete / Cancel Trip
  fastify.delete('/api/admin/trips/:id', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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

    try {
      WebSocketHub.broadcastToAll({
        type: 'TRIP_CANCELLED',
        tripId,
        messageAr: `تم إلغاء الشفت / الرحلة #${tripId}`,
        messageEn: `Shift #${tripId} has been cancelled`,
      });
    } catch (e) {
      console.warn('[Admin] Failed to broadcast trip cancellation:', e);
    }

    await CacheService.invalidateTripsAndFleetCache(tripId);

    return { success: true };
  });

  // 9. Clone Schedule
  fastify.post('/api/admin/schedules/clone', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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
        ne(schema.trips.status, 'cancelled'),
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

    try {
      WebSocketHub.broadcastToAll({
        type: 'SCHEDULE_CLONED',
        sourceDate,
        targetDate,
        clonedCount,
        messageAr: `تم نسخ جدول الرحلات إلى ${targetDate} بنجاح (${clonedCount} رحلة)`,
        messageEn: `Schedule cloned to ${targetDate} (${clonedCount} trips)`,
      });
    } catch (e) {
      console.warn('[Admin] Failed to broadcast schedule cloned event:', e);
    }

    await CacheService.invalidateTripsAndFleetCache();

    return { success: true, clonedCount, sourceDate, targetDate };
  });

  // 10. Purge All Shifts / Clear Fleet (Admin Clean Testing Action)
  fastify.delete('/api/admin/shifts/purge-all', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any, reply) => {
    const body = (request.body || {}) as any;
    const query = (request.query || {}) as any;
    const date = body.date || query.date;
    const allDates = body.allDates === true || query.allDates === 'true' || (!date && !body.date);

    const conditions = [];
    if (!allDates && date && date !== 'all') {
      conditions.push(eq(schema.trips.tripDate, date));
    }

    const targetTrips = await db.query.trips.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      columns: { id: true },
    });

    const tripIds = targetTrips.map(t => t.id);
    if (tripIds.length === 0) {
      return { success: true, purgedShiftsCount: 0, purgedBookingsCount: 0, message: 'No shifts found to purge.' };
    }

    // 1. Find all bookings on these trips
    const targetBookings = await db.query.bookings.findMany({
      where: inArray(schema.bookings.tripId, tripIds),
      columns: { id: true },
    });
    const bookingIds = targetBookings.map(b => b.id);

    // 2. Cascade delete logs and records
    if (bookingIds.length > 0) {
      await db.delete(schema.boardingLogs).where(inArray(schema.boardingLogs.bookingId, bookingIds));
      await db.delete(schema.swapLogs).where(
        or(
          inArray(schema.swapLogs.oldBookingId, bookingIds),
          inArray(schema.swapLogs.newBookingId, bookingIds)
        )
      );
      await db.delete(schema.bookings).where(inArray(schema.bookings.id, bookingIds));
    }

    await db.delete(schema.tripSupervisors).where(inArray(schema.tripSupervisors.tripId, tripIds));
    await db.delete(schema.trips).where(inArray(schema.trips.id, tripIds));

    // Clear Redis seat locks for purged trips
    try {
      for (const tid of tripIds) {
        const keys = await redis.keys(`seat_lock:${tid}:*`);
        if (keys && keys.length > 0) {
          await redis.del(...keys);
        }
      }
      // Set flag so auto-generator doesn't immediately resurrect 320 shifts
      await redis.set('admin_purged_trips_flag', '1', 'EX', 86400);
    } catch {}

    await logSecurityEvent({
      userId: request.user.id,
      action: 'ADMIN_PURGED_SHIFTS',
      entityType: 'trips',
      entityId: allDates ? 'ALL_DATES' : (date || 'ALL'),
      details: { purgedShiftsCount: tripIds.length, purgedBookingsCount: bookingIds.length, date: date || 'all' },
      ipAddress: request.ip,
    });

    WebSocketHub.broadcastToAll({
      type: 'FLEET_PURGED',
      date: date || 'all',
      messageAr: 'تم حذف الشفتات بنجاح من قبل مسؤول النظام.',
      messageEn: 'All shifts have been purged by administrator.',
    });

    await CacheService.invalidateTripsAndFleetCache();

    return {
      success: true,
      purgedShiftsCount: tripIds.length,
      purgedBookingsCount: bookingIds.length,
      date: allDates ? 'ALL' : (date || 'ALL'),
      message: `Successfully purged ${tripIds.length} shifts and ${bookingIds.length} bookings.`,
    };
  });

  // 11. Create Single Clean Test Shift (For isolated testing)
  fastify.post('/api/admin/shifts/create-single-test-shift', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
  }, async (request: any, reply) => {
    const body = request.body || {};
    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const routeId = body.routeId ? parseInt(body.routeId) : 1;
    const direction = body.direction || 'to_campus';
    const timeSlot = body.timeSlot || 'morning_1';

    const route = await db.query.routes.findFirst({
      where: eq(schema.routes.id, routeId),
    }) || await db.query.routes.findFirst({ where: eq(schema.routes.isActive, true) });

    if (!route) {
      return reply.status(400).send({ error: 'No active routes available in system' });
    }

    const [firstBus] = await db.select().from(schema.buses).limit(1);
    const [supervisorUser] = await db.select().from(schema.users).where(eq(schema.users.role, 'supervisor')).limit(1);

    const depHour = direction === 'to_campus' ? (timeSlot === 'morning_1' ? 7 : 9) : (timeSlot === 'return_1' ? 12 : 14);
    const depTime = new Date(`${targetDate}T${String(depHour).padStart(2, '0')}:00:00+02:00`);
    const retTime = new Date(depTime.getTime() + 2 * 60 * 60 * 1000);

    const [newTrip] = await db.insert(schema.trips).values({
      routeId: route.id,
      busId: firstBus ? firstBus.id : 1,
      driverId: supervisorUser?.id || null,
      tripDate: targetDate,
      departureTime: depTime,
      returnTime: retTime,
      direction,
      timeSlot,
      totalSeats: 50,
      priceEgp: '160.00',
      status: 'scheduled',
      cancellationLockHours: 3,
    }).returning();

    if (supervisorUser) {
      await db.insert(schema.tripSupervisors).values({
        tripId: newTrip.id,
        userId: supervisorUser.id,
        assignedRole: 'line_supervisor',
      }).onConflictDoNothing();
    }

    try {
      await redis.del('admin_purged_trips_flag');
    } catch {}

    await logSecurityEvent({
      userId: request.user.id,
      action: 'ADMIN_CREATED_SINGLE_TEST_SHIFT',
      entityType: 'trip',
      entityId: String(newTrip.id),
      details: { tripId: newTrip.id, targetDate, routeId: route.id, timeSlot },
      ipAddress: request.ip,
    });

    WebSocketHub.broadcastToAll({
      type: 'NEW_TRIP_ANNOUNCED',
      tripId: newTrip.id,
      routeId: newTrip.routeId,
      routeNameAr: route.nameAr,
      routeNameEn: route.nameEn,
      tripDate: newTrip.tripDate,
      timeSlot: newTrip.timeSlot,
      messageAr: `📢 تم إنشاء شفت اختباري مخصص: ${route.nameAr} (${newTrip.tripDate})`,
      messageEn: `📢 Single test shift created: ${route.nameEn} on ${newTrip.tripDate}`,
    });

    await CacheService.invalidateTripsAndFleetCache(newTrip.id);

    return {
      success: true,
      trip: newTrip,
      message: `Created single test shift #${newTrip.id} on ${route.nameAr} for ${targetDate}`,
    };
  });
}
