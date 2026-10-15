ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_ref" varchar(30);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_booking_ref_unique" ON "bookings" ("booking_ref");
