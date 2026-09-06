import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { WebSocketHub } from '../websocket/hub.js';

const requireRole = (roles: string[]) => async (request: any, reply: any) => {
  const user = request.user;
  if (!user || !roles.includes(user.role)) {
    return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
  }
};

export async function adminRoutes(fastify: FastifyInstance) {
  // 1. Fleet Status Overview
  fastify.get('/api/admin/fleet', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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

  // 2. Audit Logs
  fastify.get('/api/admin/audit-logs', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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
        messageAr: `📢 باص جديد متاح الآن! تمت إضافة حافلة على خط ${route?.nameAr || ''} لتاريخ ${newTrip.tripDate}. الحجز متاح الآن!`,
        messageEn: `📢 New bus available! Route: ${route?.nameEn || ''} on ${newTrip.tripDate}. Booking is now open!`,
      });
    } catch (e) {
      console.warn('[Admin] Failed to broadcast new trip notification:', e);
    }

    return { success: true, trip: newTrip };
  });

  // 7. Update Trip
  fastify.put('/api/admin/trips/:id', {
    preValidation: [(fastify as any).authenticate, requireRole(['admin'])],
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
}
