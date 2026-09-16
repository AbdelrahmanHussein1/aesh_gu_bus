import * as dCore from 'drizzle-orm/pg-core';
import { pgTable, uuid, integer, varchar, boolean, timestamp, numeric, jsonb, serial, text } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  erpUid: integer('erp_uid').unique(), // null for standalone supervisor/admin
  erpPartnerId: integer('erp_partner_id').unique(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  fullNameAr: varchar('full_name_ar', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 20 }).default('rider').notNull(), // 'rider', 'supervisor', 'admin'
  password: text('password'), // nullable for Odoo-only accounts, filled for custom local accounts
  academicId: varchar('academic_id', { length: 50 }),
  faculty: varchar('faculty', { length: 100 }),
  isSheerIdVerified: boolean('is_sheerid_verified').default(false),
  sheerIdVerificationId: varchar('sheerid_verification_id', { length: 100 }),
  currentSessionId: varchar('current_session_id', { length: 64 }),
  lastLoginDevice: varchar('last_login_device', { length: 255 }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Student Verification Tokens / SheerID records
export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 64 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  academicId: varchar('academic_id', { length: 50 }),
  isVerified: boolean('is_verified').default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Routes
export const routes = pgTable('routes', {
  id: serial('id').primaryKey(),
  erpPointId: integer('erp_point_id').unique(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Stops
export const stops = pgTable('stops', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id').references(() => routes.id, { onDelete: 'cascade' }),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  googlePlaceId: varchar('google_place_id', { length: 255 }),
  arriveTime: varchar('arrive_time', { length: 8 }), // HH:MM
  departTime: varchar('depart_time', { length: 8 }), // HH:MM
  stopOrder: integer('stop_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Buses
export const buses = pgTable('buses', {
  id: serial('id').primaryKey(),
  erpVehicleId: integer('erp_vehicle_id').unique(),
  name: varchar('name', { length: 255 }).notNull(),
  licensePlate: varchar('license_plate', { length: 50 }),
  totalSeats: integer('total_seats').default(50).notNull(),
  seatRows: integer('seat_rows').default(10).notNull(),
  seatsPerRow: integer('seats_per_row').default(5).notNull(),
  busType: varchar('bus_type', { length: 50 }).default('seating'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Trips — now with time slot and driver support
export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id').references(() => routes.id).notNull(),
  busId: integer('bus_id').references(() => buses.id).notNull(),
  driverId: uuid('driver_id').references(() => users.id),
  tripDate: varchar('trip_date', { length: 10 }).notNull(), // YYYY-MM-DD
  departureTime: timestamp('departure_time', { withTimezone: true }).notNull(),
  returnTime: timestamp('return_time', { withTimezone: true }),
  direction: varchar('direction', { length: 15 }).default('to_campus').notNull(), // 'to_campus', 'from_campus'
  timeSlot: varchar('time_slot', { length: 20 }).default('morning_1').notNull(),
    // 'morning_1' (09:00), 'morning_2' (11:30), 'return_1' (12:30), 'return_2' (14:30), 'return_3' (17:30), 'return'
  totalSeats: integer('total_seats').notNull(),
  priceEgp: numeric('price_egp', { precision: 10, scale: 2 }).default('160.00').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // 'scheduled', 'boarding', 'departed', 'completed', 'cancelled'
  cancellationLockHours: integer('cancellation_lock_hours').default(3).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Trip Supervisors (مرافقي الخطوط) — Multiple supervisors per line/trip
export const tripSupervisors = pgTable('trip_supervisors', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  assignedRole: varchar('assigned_role', { length: 50 }).default('line_supervisor').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Bookings — with dual QR and round-trip support
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: integer('trip_id').references(() => trips.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  seatNumber: integer('seat_number').notNull(),
  status: varchar('status', { length: 20 }).default('pending_payment').notNull(),
    // 'pending_payment', 'confirmed', 'cancelled', 'swapped', 'no_show'
  bookingType: varchar('booking_type', { length: 20 }).default('one_way').notNull(),
    // 'one_way', 'round_trip'
  legType: varchar('leg_type', { length: 15 }).default('to_campus').notNull(),
    // 'to_campus', 'from_campus'
  pairedBookingId: uuid('paired_booking_id'),
    // Links arrival booking <-> return booking for round trips
  qrToken: text('qr_token').unique(),
  boardingCode: varchar('boarding_code', { length: 20 }),
  qrVersion: integer('qr_version').default(1).notNull(),
  qrExpiresAt: timestamp('qr_expires_at', { withTimezone: true }),
    // 24h after booking creation — QR is invalid after this
  qrUsedAt: timestamp('qr_used_at', { withTimezone: true }),
    // Set when QR is scanned — prevents re-use
  paymentId: varchar('payment_id', { length: 255 }), // Order/Receipt reference
  paymentStatus: varchar('payment_status', { length: 20 }),
    // 'pending', 'paid', 'receipt_uploaded', 'failed', 'refunded'
  receiptImage: text('receipt_image'), // URL or Base64 for manual receipts
  receiptRef: varchar('receipt_ref', { length: 255 }), // receipt reference code from Instapay/Telda
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  swappedFromBookingId: uuid('swapped_from_booking_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueActiveSeat: dCore.uniqueIndex('unique_active_seat').on(table.tripId, table.seatNumber).where(sql`status IN ('confirmed', 'swapped')`),
  tripSeatIdx: dCore.index('idx_bookings_trip_seat').on(table.tripId, table.seatNumber),
}));

// Boarding Logs
export const boardingLogs = pgTable('boarding_logs', {
  id: serial('id').primaryKey(),
  bookingId: uuid('booking_id').references(() => bookings.id).notNull(),
  scannedBy: uuid('scanned_by').references(() => users.id).notNull(),
  scannedAt: timestamp('scanned_at', { withTimezone: true }).defaultNow().notNull(),
  scanResult: varchar('scan_result', { length: 25 }).default('valid').notNull(),
    // 'valid', 'already_checked_in', 'wrong_bus', 'invalid', 'expired', 'wrong_leg'
  deviceInfo: varchar('device_info', { length: 255 }),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
}, (table) => ({
  bookingScannedIdx: dCore.index('idx_boarding_logs_booking_scanned').on(table.bookingId, table.scannedAt),
}));

// Swap Logs
export const swapLogs = pgTable('swap_logs', {
  id: serial('id').primaryKey(),
  oldBookingId: uuid('old_booking_id').references(() => bookings.id),
  newBookingId: uuid('new_booking_id').references(() => bookings.id),
  performedBy: uuid('performed_by').references(() => users.id).notNull(),
  reason: text('reason'),
  oldTripId: integer('old_trip_id'),
  oldSeatNumber: integer('old_seat_number'),
  newTripId: integer('new_trip_id'),
  newSeatNumber: integer('new_seat_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 255 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// System Settings
export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  drivenTrips: many(trips),
  supervisedTrips: many(tripSupervisors),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  stops: many(stops),
  trips: many(trips),
}));

export const stopsRelations = relations(stops, ({ one }) => ({
  route: one(routes, { fields: [stops.routeId], references: [routes.id] }),
}));

export const busesRelations = relations(buses, ({ many }) => ({
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  route: one(routes, { fields: [trips.routeId], references: [routes.id] }),
  bus: one(buses, { fields: [trips.busId], references: [buses.id] }),
  driver: one(users, { fields: [trips.driverId], references: [users.id] }),
  supervisors: many(tripSupervisors),
  bookings: many(bookings),
}));

export const tripSupervisorsRelations = relations(tripSupervisors, ({ one }) => ({
  trip: one(trips, { fields: [tripSupervisors.tripId], references: [trips.id] }),
  user: one(users, { fields: [tripSupervisors.userId], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  trip: one(trips, { fields: [bookings.tripId], references: [trips.id] }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  boardingLogs: many(boardingLogs),
  pairedBooking: one(bookings, { fields: [bookings.pairedBookingId], references: [bookings.id] }),
}));

export const boardingLogsRelations = relations(boardingLogs, ({ one }) => ({
  booking: one(bookings, { fields: [boardingLogs.bookingId], references: [bookings.id] }),
  scanner: one(users, { fields: [boardingLogs.scannedBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
